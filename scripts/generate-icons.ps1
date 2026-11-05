Add-Type -AssemblyName System.Drawing

function Generate-Icon([int]$size, [string]$outPath) {
    $bmp = New-Object System.Drawing.Bitmap $size, $size
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
    $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality

    # Background: Pure Black #000000
    $blackBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(0, 0, 0))
    $g.FillRectangle($blackBrush, 0, 0, $size, $size)

    # Yellow Color #facc15 (250, 204, 21)
    $yellowColor = [System.Drawing.Color]::FromArgb(250, 204, 21)
    $yellowBrush = New-Object System.Drawing.SolidBrush($yellowColor)

    # Outer Yellow Border: 3.5% of size with sharp corners
    $borderWidth = [Math]::Max(2, [int]($size * 0.035))
    $borderPen = New-Object System.Drawing.Pen($yellowColor, $borderWidth)
    $offset = [int]($borderWidth / 2) + [Math]::Max(1, [int]($size * 0.02))
    $g.DrawRectangle($borderPen, $offset, $offset, $size - 2 * $offset, $size - 2 * $offset)

    # Yellow Central Badge (Header Icon style: sharp yellow square with black dumbbell)
    # The badge is centered, taking up ~65% of the total size
    $badgeMargin = [int]($size * 0.16)
    $badgeSize = $size - 2 * $badgeMargin
    $g.FillRectangle($yellowBrush, $badgeMargin, $badgeMargin, $badgeSize, $badgeSize)

    # Dumbbell inside the badge in black
    # Lucide Dumbbell coordinates normalized to 24x24 box
    # Scale from 24x24 to badgeSize with padding
    $scale = ($badgeSize * 0.65) / 24.0
    $tx = $badgeMargin + ($badgeSize - ($scale * 24)) / 2.0
    $ty = $badgeMargin + ($badgeSize - ($scale * 24)) / 2.0

    $g.TranslateTransform($tx, $ty)
    $g.ScaleTransform($scale, $scale)

    $dbStrokeWidth = 2.4
    $dbPen = New-Object System.Drawing.Pen([System.Drawing.Color]::Black, $dbStrokeWidth)
    $dbPen.StartCap = [System.Drawing.Drawing2D.LineCap]::Round
    $dbPen.EndCap = [System.Drawing.Drawing2D.LineCap]::Round
    $dbPen.LineJoin = [System.Drawing.Drawing2D.LineJoin]::Round

    # Draw dumbbell segments
    # Path 1: M17.596 12.768a2 2 0 1 0 2.829-2.829l-1.768-1.767a2 2 0 0 0 2.828-2.829l-2.828-2.828a2 2 0 0 0-2.829 2.828l-1.767-1.768a2 2 0 1 0-2.829 2.829z
    # Path 2: m2.5 21.5 1.4-1.4
    # Path 3: m20.1 3.9 1.4-1.4
    # Path 4: M5.343 21.485a2 2 0 1 0 2.829-2.828l1.768 1.767a2 2 0 1 0 2.829-2.829l-6.364-6.364a2 2 0 1 0-2.829 2.829l1.768 1.767a2 2 0 0 0-2.828 2.829z
    # Path 5: m9.6 14.4 4.8-4.8
    #
    # Or draw clean dumbbell geometry using standard angled bar and plates!
    # Let's test!
    $g.ResetTransform()

    $bmp.Save($outPath, [System.Drawing.Imaging.ImageFormat]::Png)
    $g.Dispose()
    $bmp.Dispose()
    Write-Host "Generated $outPath ($size x $size)"
}

Generate-Icon 512 "public\test-badge.png"
