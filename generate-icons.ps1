# SSH MDZZ 图标生成脚本
# 需要安装 Inkscape 或使用在线 SVG 转换工具

Write-Host "生成 SSH MDZZ 应用图标..." -ForegroundColor Green

# 创建图标目录
$iconDir = "build/icons"
if (!(Test-Path $iconDir)) {
    New-Item -ItemType Directory -Path $iconDir -Force
}

# Wails 需要的图标尺寸
$sizes = @(16, 32, 48, 64, 128, 256, 512, 1024)

Write-Host "需要生成的图标尺寸: $($sizes -join ', ')" -ForegroundColor Yellow

# 如果系统安装了 Inkscape
$inkscapePath = Get-Command inkscape -ErrorAction SilentlyContinue

if ($inkscapePath) {
    Write-Host "检测到 Inkscape，开始生成图标..." -ForegroundColor Green
    
    foreach ($size in $sizes) {
        $outputFile = "$iconDir/icon_${size}x${size}.png"
        Write-Host "生成 ${size}x${size} 图标..." -ForegroundColor Cyan
        
        & inkscape mdzz.svg --export-png=$outputFile --export-width=$size --export-height=$size
        
        if (Test-Path $outputFile) {
            Write-Host "✓ 生成成功: $outputFile" -ForegroundColor Green
        } else {
            Write-Host "✗ 生成失败: $outputFile" -ForegroundColor Red
        }
    }
    
    # 生成主应用图标
    Write-Host "生成主应用图标..." -ForegroundColor Cyan
    & inkscape mdzz.svg --export-png=build/appicon.png --export-width=512 --export-height=512
    
    # 生成 Windows ICO 文件（如果有 ImageMagick）
    $magickPath = Get-Command magick -ErrorAction SilentlyContinue
    if ($magickPath) {
        Write-Host "生成 Windows ICO 文件..." -ForegroundColor Cyan
        $iconFiles = $sizes | ForEach-Object { "$iconDir/icon_${_}x${_}.png" }
        & magick $iconFiles build/icon.ico
        
        if (Test-Path "build/icon.ico") {
            Write-Host "✓ ICO 文件生成成功" -ForegroundColor Green
        }
    }
    
} else {
    Write-Host "未检测到 Inkscape，请手动转换 SVG 文件" -ForegroundColor Yellow
    Write-Host "推荐工具:" -ForegroundColor White
    Write-Host "1. Inkscape (免费): https://inkscape.org/" -ForegroundColor White
    Write-Host "2. 在线转换: https://convertio.co/svg-png/" -ForegroundColor White
    Write-Host "3. GIMP (免费): https://www.gimp.org/" -ForegroundColor White
    
    Write-Host "`n需要生成的文件:" -ForegroundColor White
    foreach ($size in $sizes) {
        Write-Host "- build/icons/icon_${size}x${size}.png" -ForegroundColor Gray
    }
    Write-Host "- build/appicon.png (512x512)" -ForegroundColor Gray
    Write-Host "- build/icon.ico (Windows)" -ForegroundColor Gray
}

Write-Host "`n图标生成完成！" -ForegroundColor Green