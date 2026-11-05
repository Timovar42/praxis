$edgePath = "C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"
$htmlPath = (Resolve-Path "scripts\render-icon.html").Path
$fileUri = "file:///" + $htmlPath.Replace("\", "/")
$temp512 = (Resolve-Path ".").Path + "\public\pwa-512x512.png"

Write-Host "Rendering 512x512 with Edge..."
$args = @(
    "--headless",
    "--disable-gpu",
    "--window-size=512,512",
    "--force-device-scale-factor=1",
    "--screenshot=$temp512",
    $fileUri
)

& $edgePath $args
Start-Sleep -Seconds 2

if (Test-Path $temp512) {
    Write-Host "Success: $temp512 created"
    
    Add-Type -AssemblyName System.Drawing
    $srcImg = [System.Drawing.Image]::FromFile($temp512)

    # Function to resize high-quality image
    function Resize-Image($source, [int]$targetWidth, [int]$targetHeight, [string]$outPath) {
        $destBmp = New-Object System.Drawing.Bitmap $targetWidth, $targetHeight
        $g = [System.Drawing.Graphics]::FromImage($destBmp)
        $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
        $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
        $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
        $g.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality

        $g.DrawImage($source, 0, 0, $targetWidth, $targetHeight)
        $destBmp.Save($outPath, [System.Drawing.Imaging.ImageFormat]::Png)
        $g.Dispose()
        $destBmp.Dispose()
        Write-Host "Created: $outPath ($targetWidth x $targetHeight)"
    }

    # Generate 192x192 for PWA Android
    Resize-Image $srcImg 192 192 "public\pwa-192x192.png"

    # Generate 180x180 for Apple touch icon
    Resize-Image $srcImg 180 180 "public\apple-touch-icon.png"

    # Generate 32x32 for legacy favicon
    Resize-Image $srcImg 32 32 "public\favicon-32x32.png"

    $srcImg.Dispose()
    Write-Host "All icons generated successfully!"
} else {
    Write-Error "Failed to generate $temp512"
}
