@echo off
setlocal
set "BASE_DIR=%~dp0"
set "PROPERTIES_FILE=%BASE_DIR%.mvn\wrapper\maven-wrapper.properties"
set "MAVEN_VERSION=3.9.9"
set "MAVEN_HOME=%USERPROFILE%\.m2\wrapper\dists\apache-maven-%MAVEN_VERSION%"
set "MAVEN_BIN=%MAVEN_HOME%\apache-maven-%MAVEN_VERSION%\bin\mvn.cmd"

if not exist "%MAVEN_BIN%" (
  set "ARCHIVE=%MAVEN_HOME%\apache-maven-%MAVEN_VERSION%-bin.zip"
  if not exist "%MAVEN_HOME%" mkdir "%MAVEN_HOME%"
  powershell.exe -NoProfile -ExecutionPolicy Bypass -Command "Invoke-WebRequest -UseBasicParsing -Uri 'https://repo.maven.apache.org/maven2/org/apache/maven/apache-maven/%MAVEN_VERSION%/apache-maven-%MAVEN_VERSION%-bin.zip' -OutFile '%MAVEN_HOME%\apache-maven-%MAVEN_VERSION%-bin.zip'; Expand-Archive -Force '%MAVEN_HOME%\apache-maven-%MAVEN_VERSION%-bin.zip' '%MAVEN_HOME%'"
)

call "%MAVEN_BIN%" %*
exit /b %ERRORLEVEL%
