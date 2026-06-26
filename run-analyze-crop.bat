@echo off
cd /d C:\Users\balah\workspace\trinitas
powershell -NoProfile -ExecutionPolicy Bypass -File analyze-bounds-fast.ps1 > analyze-crop-output.txt 2>&1
type analyze-crop-output.txt