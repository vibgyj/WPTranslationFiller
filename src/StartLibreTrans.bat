@echo off
REM ========================================
REM Batch script om lokale LibreTranslate te starten
REM ========================================

REM 1. Ga naar je projectfolder
cd /d C:\Users\peter\LibreTranslate

REM 2. Activeer de venv 3.11
call C:\Users\peter\venv311\Scripts\activate.bat

REM 3. Start de LibreTranslate server, load only languages indicated
python main.py --load-only en,es,de,fr,nl

REM 4. (optioneel) Python testscript
REM python run_translate.py

REM 5. Houd de CMD open zodat je logs kunt zien
pause
