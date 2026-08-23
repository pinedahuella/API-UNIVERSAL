@echo off
title API UNIVERSAL
cd /d "%~dp0"
start "" http://localhost:4321
node servidor\servidor.js
