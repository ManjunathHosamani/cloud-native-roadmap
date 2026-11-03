@echo off
REM Windows entry point so that "make <task>" works the same as on Linux/macOS.
REM   make            list tasks
REM   make run        build and open the app
REM   make dist       binaries for every platform in dist\
REM   make deploy     build the image and roll it out to Kubernetes
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\make.ps1" %*
exit /b %errorlevel%
