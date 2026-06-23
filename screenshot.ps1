Add-Type -AssemblyName System.Windows.Forms
$img = [System.Windows.Forms.Clipboard]::GetImage()
if ($img) {
    $img.Save("C:\levynchi\image.png")
    Write-Host "נשמר: C:\levynchi\image.png"
} else {
    Write-Host "אין תמונה בקליפבורד"
}
