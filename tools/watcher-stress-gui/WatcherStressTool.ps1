param(
    [switch]$Worker,
    [string]$Scenario = "append-log",
    [string]$TestRoot,
    [string]$StatusRoot,
    [string]$RunId,
    [int]$DurationSeconds = 30,
    [int]$IntervalMs = 50,
    [int]$Count = 2000
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

function Assert-SafeTargetRoot([string]$Path) {
    if ([string]::IsNullOrWhiteSpace($Path)) { throw "测试目录不能为空" }
    $resolved = [IO.Path]::GetFullPath($Path)
    if (-not [IO.Directory]::Exists($resolved)) { throw "测试目录不存在" }
    $parent = [IO.Directory]::GetParent($resolved)
    if ($null -eq $parent -or $parent.FullName -eq $resolved) { throw "不能在磁盘根目录运行" }
    return $resolved
}

function Write-Status([string]$Root, [string]$State, [long]$Operations, [datetime]$StartedAt, [string]$Message = "") {
    $elapsed = [Math]::Max(0.001, ((Get-Date) - $StartedAt).TotalSeconds)
    $data = [ordered]@{
        state = $State; scenario = $Scenario; operations = $Operations
        operationsPerSecond = [Math]::Round($Operations / $elapsed, 2)
        elapsedSeconds = [Math]::Round($elapsed, 1); message = $Message
        updatedAt = (Get-Date).ToString("o")
    }
    $temp = Join-Path $Root "status.tmp"
    $data | ConvertTo-Json | Set-Content -LiteralPath $temp -Encoding UTF8
    Move-Item -LiteralPath $temp -Destination (Join-Path $Root "status.json") -Force
}

function Invoke-Worker {
    $root = Assert-SafeTargetRoot $TestRoot
    if ([string]::IsNullOrWhiteSpace($StatusRoot) -or [string]::IsNullOrWhiteSpace($RunId)) { throw "缺少运行状态目录或运行 ID" }
    $statusDirectory = [IO.Path]::GetFullPath($StatusRoot)
    New-Item -ItemType Directory -Path $statusDirectory -Force | Out-Null
    $prefix = "watcher-test-$RunId"
    @{ tool="WatcherStressTool"; runId=$RunId; targetRoot=$root; prefix=$prefix } | ConvertTo-Json |
        Set-Content -LiteralPath (Join-Path $statusDirectory "manifest.json") -Encoding UTF8
    $started = Get-Date
    $deadline = $started.AddSeconds([Math]::Max(1, $DurationSeconds))
    [long]$script:operations = 0
    $script:lastStatus = [datetime]::MinValue

    function Update-Status {
        if (((Get-Date) - $script:lastStatus).TotalMilliseconds -ge 400) {
            Write-Status $statusDirectory "running" $script:operations $started
            $script:lastStatus = Get-Date
        }
    }
    function Numbered([string]$Directory, [string]$Prefix, [long]$Index, [string]$Extension = ".tmp") {
        Join-Path $Directory ("{0}-{1:D8}{2}" -f $Prefix, $Index, $Extension)
    }
    function Run-Timed([scriptblock]$Action) {
        [long]$index = 0
        while ((Get-Date) -lt $deadline) {
            & $Action $index
            $script:operations++; $index++; Update-Status
            if ($IntervalMs -gt 0) { Start-Sleep -Milliseconds $IntervalMs }
        }
    }

    try {
        Write-Status $statusDirectory "running" 0 $started "测试已启动"
        switch ($Scenario) {
            "append-log" {
                $file = Join-Path $root "$prefix-application.log"
                Run-Timed { param($i) Add-Content -LiteralPath $file -Value ("{0:o} log {1}" -f (Get-Date), $i) -Encoding UTF8 }
            }
            "create-files" {
                Run-Timed { param($i) Set-Content -LiteralPath (Numbered $root "$prefix-cache" $i) -Value $i -Encoding UTF8 }
            }
            "batch-create" {
                $batchSize = [Math]::Min([Math]::Max(2, $Count), 500); [long]$index = 0
                while ((Get-Date) -lt $deadline) {
                    for ($i = 0; $i -lt $batchSize; $i++) {
                        Set-Content -LiteralPath (Numbered $root "$prefix-batch" $index) -Value $index -Encoding UTF8
                        $script:operations++; $index++
                    }
                    Update-Status
                    if ($IntervalMs -gt 0) { Start-Sleep -Milliseconds $IntervalMs }
                }
            }
            "rotate-log" {
                $file = Join-Path $root "$prefix-rotating.log"; Set-Content $file "start"
                Run-Timed { param($i)
                    Add-Content $file "rotation $i"; $rotated = "$file.$($i % 5)"
                    Remove-Item $rotated -Force -ErrorAction SilentlyContinue
                    Move-Item $file $rotated -Force; Set-Content $file "new log"
                }
            }
            "atomic-save" {
                $file = Join-Path $root "$prefix-example.txt"; Set-Content $file "initial"
                Run-Timed { param($i)
                    $temp = "$file.watcher-tmp"; Set-Content $temp "version $i"
                    Remove-Item $file -Force -ErrorAction SilentlyContinue; Move-Item $temp $file -Force
                }
            }
            "create-delete" {
                Run-Timed { param($i) $file = Numbered $root "$prefix-temp" $i; Set-Content $file "temp"; Remove-Item $file -Force }
            }
            "burst" {
                for ([long]$i = 0; $i -lt [Math]::Max(1, $Count); $i++) {
                    Set-Content -LiteralPath (Numbered $root "$prefix-generated" $i) -Value $i -Encoding UTF8
                    $script:operations++; Update-Status
                }
            }
            "deep-tree" {
                $dir = Join-Path $root "$prefix-deep-build"; New-Item -ItemType Directory $dir -Force | Out-Null
                for ($level = 0; $level -lt 12; $level++) {
                    $dir = Join-Path $dir "level-$level"; New-Item -ItemType Directory $dir -Force | Out-Null
                    for ($i = 0; $i -lt 20; $i++) { Set-Content (Join-Path $dir "artifact-$i.tmp") "artifact"; $script:operations++ }
                    Update-Status
                }
            }
            "move-files" {
                $moveRoot = Join-Path $root "$prefix-move-test"
                $source = Join-Path $moveRoot "source"; $dest = Join-Path $moveRoot "destination"
                New-Item -ItemType Directory $source -Force | Out-Null; New-Item -ItemType Directory $dest -Force | Out-Null
                for ([long]$i = 0; $i -lt [Math]::Max(1, $Count); $i++) { Set-Content (Numbered $source "move" $i) $i; $script:operations++ }
                for ([long]$i = 0; $i -lt [Math]::Max(1, $Count); $i++) {
                    Move-Item (Numbered $source "move" $i) (Numbered $dest "move" $i) -Force
                    $script:operations++; Update-Status
                    if ($IntervalMs -gt 0) { Start-Sleep -Milliseconds $IntervalMs }
                }
            }
            "mixed" {
                $log = Join-Path $root "$prefix-mixed.log"
                Run-Timed { param($i)
                    Add-Content $log "log $i"; Set-Content (Numbered $root "$prefix-mixed-cache" $i) $i
                    $temp = Numbered $root "$prefix-mixed-temp" $i; Set-Content $temp "temp"; Remove-Item $temp -Force
                }
            }
            default { throw "未知测试场景：$Scenario" }
        }
        Write-Status $statusDirectory "completed" $script:operations $started "测试完成"
    } catch {
        Write-Status $statusDirectory "failed" $script:operations $started $_.Exception.Message
        throw
    }
}

if ($Worker) { Invoke-Worker; exit 0 }

# Enable crisp rendering on 125%-200% scaling and mixed-DPI monitors.
Add-Type -TypeDefinition @"
using System;
using System.Runtime.InteropServices;
public static class WatcherStressDpi {
    [DllImport("user32.dll")] static extern bool SetProcessDpiAwarenessContext(IntPtr value);
    [DllImport("user32.dll")] static extern bool SetProcessDPIAware();
    public static void Enable() {
        try { if (SetProcessDpiAwarenessContext(new IntPtr(-4))) return; } catch (EntryPointNotFoundException) {}
        try { SetProcessDPIAware(); } catch (EntryPointNotFoundException) {}
    }
}
"@
[WatcherStressDpi]::Enable()
Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing
[Windows.Forms.Application]::EnableVisualStyles()

$form = New-Object Windows.Forms.Form
$form.Text = "文件监听压力测试工具"; $form.Size = New-Object Drawing.Size(780, 640)
$form.MinimumSize = New-Object Drawing.Size(720, 580); $form.StartPosition = "CenterScreen"
$form.AutoScaleMode = [Windows.Forms.AutoScaleMode]::Dpi; $form.Font = New-Object Drawing.Font("Microsoft YaHei UI", 9)

function Label([string]$Text, [int]$X, [int]$Y, [int]$Size = 9) {
    $c = New-Object Windows.Forms.Label; $c.Text = $Text; $c.AutoSize = $true
    $c.Location = New-Object Drawing.Point($X, $Y); $c.Font = New-Object Drawing.Font("Microsoft YaHei UI", $Size)
    $form.Controls.Add($c); return $c
}

$heading = Label "文件监听压力测试" 24 18 16
$subheading = Label "生成可控文件变化，验证资源管理器是否只做局部刷新" 27 54
$subheading.ForeColor = [Drawing.Color]::DimGray
Label "待测试项目目录" 28 92 | Out-Null
$pathBox = New-Object Windows.Forms.TextBox; $pathBox.Location = New-Object Drawing.Point(28, 114); $pathBox.Size = New-Object Drawing.Size(610, 28); $pathBox.Text = (Get-Location).Path; $form.Controls.Add($pathBox)
$browse = New-Object Windows.Forms.Button; $browse.Text = "选择…"; $browse.Location = New-Object Drawing.Point(648, 112); $browse.Size = New-Object Drawing.Size(90, 30); $form.Controls.Add($browse)

Label "测试场景" 28 158 | Out-Null
$scenarioBox = New-Object Windows.Forms.ComboBox; $scenarioBox.DropDownStyle = "DropDownList"; $scenarioBox.Location = New-Object Drawing.Point(28, 181); $scenarioBox.Size = New-Object Drawing.Size(278, 28)
$scenarios = [ordered]@{
    "持续追加同一日志"="append-log"; "自定义目录持续创建文件"="create-files"; "周期性批量创建多个文件"="batch-create"
    "日志轮转"="rotate-log"; "原子保存"="atomic-save"; "创建后立即删除"="create-delete"
    "瞬时批量创建"="burst"; "深层目录树"="deep-tree"; "跨目录移动"="move-files"; "混合场景"="mixed"
}
[void]$scenarioBox.Items.AddRange([object[]]$scenarios.Keys); $scenarioBox.SelectedIndex = 0; $form.Controls.Add($scenarioBox)

Label "持续时间（秒）" 326 158 | Out-Null
$duration = New-Object Windows.Forms.NumericUpDown; $duration.Location = New-Object Drawing.Point(326,181); $duration.Size = New-Object Drawing.Size(120,28); $duration.Minimum=1; $duration.Maximum=3600; $duration.Value=30; $form.Controls.Add($duration)
Label "间隔（毫秒）" 466 158 | Out-Null
$interval = New-Object Windows.Forms.NumericUpDown; $interval.Location = New-Object Drawing.Point(466,181); $interval.Size = New-Object Drawing.Size(120,28); $interval.Minimum=1; $interval.Maximum=60000; $interval.Value=50; $form.Controls.Add($interval)
Label "文件/每批数量" 606 158 | Out-Null
$countInput = New-Object Windows.Forms.NumericUpDown; $countInput.Location = New-Object Drawing.Point(606,181); $countInput.Size = New-Object Drawing.Size(132,28); $countInput.Minimum=1; $countInput.Maximum=1000000; $countInput.Value=2000; $form.Controls.Add($countInput)
$scenarioBox.Add_SelectedIndexChanged({ if ($scenarios[$scenarioBox.SelectedItem.ToString()] -eq "batch-create") { $countInput.Value = 20 } })

function Button([string]$Text,[int]$X,[int]$Width) { $b=New-Object Windows.Forms.Button; $b.Text=$Text; $b.Location=New-Object Drawing.Point($X,232); $b.Size=New-Object Drawing.Size($Width,36); $form.Controls.Add($b); return $b }
$start=Button "开始测试" 28 120; $start.BackColor=[Drawing.Color]::FromArgb(0,120,212); $start.ForeColor=[Drawing.Color]::White; $start.FlatStyle="Flat"
$stop=Button "停止" 158 90; $stop.Enabled=$false
$cleanup=Button "清理测试文件" 258 125
$openDir=Button "打开测试目录" 393 125

$state = Label "状态：未运行" 28 296
$metrics = Label "操作次数：0    每秒操作：0    运行时间：0 秒" 28 326; $metrics.Font = New-Object Drawing.Font("Consolas",10)
$progress=New-Object Windows.Forms.ProgressBar; $progress.Location=New-Object Drawing.Point(28,356); $progress.Size=New-Object Drawing.Size(710,18); $form.Controls.Add($progress)
Label "运行日志" 28 396 | Out-Null
$log=New-Object Windows.Forms.TextBox; $log.Location=New-Object Drawing.Point(28,420); $log.Size=New-Object Drawing.Size(710,135); $log.Multiline=$true; $log.ReadOnly=$true; $log.ScrollBars="Vertical"; $log.Font=New-Object Drawing.Font("Consolas",9); $form.Controls.Add($log)

$script:process=$null; $script:root=$null; $script:activeDuration=0
$script:statusRoot = Join-Path ([IO.Path]::GetTempPath()) ("WatcherStressTool\{0}" -f [guid]::NewGuid().ToString("N"))
New-Item -ItemType Directory -Path $script:statusRoot -Force | Out-Null
function Log([string]$Text) { $log.AppendText(("[{0:HH:mm:ss}] {1}`r`n" -f (Get-Date),$Text)) }
function RootFromUi { Assert-SafeTargetRoot $pathBox.Text.Trim() }
function Set-Running([bool]$Running) { $start.Enabled=-not $Running; $stop.Enabled=$Running; $pathBox.Enabled=-not $Running; $scenarioBox.Enabled=-not $Running }

$browse.Add_Click({ $d=New-Object Windows.Forms.FolderBrowserDialog; $d.Description="选择待测试项目目录"; $d.SelectedPath=$pathBox.Text; if($d.ShowDialog() -eq "OK"){$pathBox.Text=$d.SelectedPath} })
$start.Add_Click({ try {
    if($null-ne $script:process -and -not $script:process.HasExited){throw "已有测试正在运行"}
    $script:root=RootFromUi; $script:activeDuration=[int]$duration.Value; $code=$scenarios[$scenarioBox.SelectedItem.ToString()]
    $runId=(Get-Date).ToString("yyyyMMddHHmmssfff")
    Remove-Item -LiteralPath (Join-Path $script:statusRoot "status.json") -Force -ErrorAction SilentlyContinue
    Remove-Item -LiteralPath (Join-Path $script:statusRoot "manifest.json") -Force -ErrorAction SilentlyContinue
    $args="-NoProfile -ExecutionPolicy Bypass -File `"$PSCommandPath`" -Worker -Scenario $code -TestRoot `"$script:root`" -StatusRoot `"$script:statusRoot`" -RunId $runId -DurationSeconds $([int]$duration.Value) -IntervalMs $([int]$interval.Value) -Count $([int]$countInput.Value)"
    $script:process=Start-Process powershell.exe -ArgumentList $args -WindowStyle Hidden -PassThru
    Set-Running $true; $progress.Value=0; $state.Text="状态：启动中"; Log "启动：$($scenarioBox.SelectedItem)"; Log "目录：$script:root"
} catch {[Windows.Forms.MessageBox]::Show($_.Exception.Message,"无法启动","OK","Error")|Out-Null} })
$stop.Add_Click({ if($null-ne $script:process -and -not $script:process.HasExited){$script:process.Kill();$script:process.WaitForExit(2000)|Out-Null}; Set-Running $false; $state.Text="状态：已停止"; Log "测试已停止" })
$cleanup.Add_Click({ try {
    if($null-ne $script:process -and -not $script:process.HasExited){throw "请先停止测试"}; $r=RootFromUi
    $manifestFile=Join-Path $script:statusRoot "manifest.json"
    if(-not(Test-Path $manifestFile)){Log "没有需要清理的本次测试文件";return}
    $manifest=Get-Content $manifestFile -Raw -Encoding UTF8|ConvertFrom-Json
    if($manifest.tool-ne"WatcherStressTool"-or[IO.Path]::GetFullPath($manifest.targetRoot)-ne$r){throw "清理清单与当前目标目录不匹配"}
    $items=@(Get-ChildItem -LiteralPath $r -Force | Where-Object {$_.Name.StartsWith([string]$manifest.prefix,[StringComparison]::OrdinalIgnoreCase)})
    if([Windows.Forms.MessageBox]::Show("确定删除本次工具生成的 $($items.Count) 个文件或目录？`n不会删除目标目录。","确认清理","YesNo","Warning") -eq "Yes"){
        foreach($item in $items){$full=[IO.Path]::GetFullPath($item.FullName);$rootPrefix=$r.TrimEnd([IO.Path]::DirectorySeparatorChar)+[IO.Path]::DirectorySeparatorChar;if(-not$full.StartsWith($rootPrefix,[StringComparison]::OrdinalIgnoreCase)-or-not[IO.Path]::GetFileName($full).StartsWith([string]$manifest.prefix,[StringComparison]::OrdinalIgnoreCase)){throw "清理路径安全检查失败：$full"};Remove-Item -LiteralPath $full -Recurse -Force -ErrorAction SilentlyContinue}
        Remove-Item $manifestFile -Force; Log "已清理本次生成内容"; $state.Text="状态：已清理"; $metrics.Text="操作次数：0    每秒操作：0    运行时间：0 秒"; $progress.Value=0
    }
} catch {[Windows.Forms.MessageBox]::Show($_.Exception.Message,"无法清理","OK","Error")|Out-Null} })
$openDir.Add_Click({ try {$r=RootFromUi; Start-Process explorer.exe -ArgumentList "`"$r`""} catch {[Windows.Forms.MessageBox]::Show($_.Exception.Message,"无法打开","OK","Error")|Out-Null} })

$timer=New-Object Windows.Forms.Timer; $timer.Interval=400
$timer.Add_Tick({
    if([string]::IsNullOrWhiteSpace($script:root)){return}; $file=Join-Path $script:statusRoot "status.json"
    if(Test-Path $file){try{$s=Get-Content $file -Raw -Encoding UTF8|ConvertFrom-Json; $metrics.Text="操作次数：$($s.operations)    每秒操作：$($s.operationsPerSecond)    运行时间：$($s.elapsedSeconds) 秒"; $state.Text="状态：$($s.state)  $($s.message)"; if($script:activeDuration-gt 0){$progress.Value=[int][Math]::Min(100,[Math]::Round(($s.elapsedSeconds/$script:activeDuration)*100))}; if($s.state-in @("completed","failed")){Set-Running $false}}catch{}}
    if($null-ne $script:process -and $script:process.HasExited){Set-Running $false}
}); $timer.Start()
$form.Add_FormClosing({if($null-ne $script:process -and -not $script:process.HasExited){if([Windows.Forms.MessageBox]::Show("测试仍在运行，停止并退出？","确认退出","YesNo","Warning")-ne "Yes"){$_.Cancel=$true;return};$script:process.Kill()}})
[void]$form.ShowDialog()
