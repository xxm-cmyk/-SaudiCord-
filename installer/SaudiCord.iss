#define MyAppName "SaudiCord"
#define MyAppVersion "1.15.6.0"
#define MyAppPublisher "SaudiCord"
#define MyAppExeName "node.exe"

[Setup]
AppId={{D1E7B0E4-6C0F-4A5D-A6A2-5C0F2D8E77B1}
AppName={#MyAppName}
AppVersion={#MyAppVersion}
AppPublisher={#MyAppPublisher}
DefaultDirName={localappdata}\Programs\SaudiCord
DisableProgramGroupPage=yes
PrivilegesRequired=lowest
ArchitecturesInstallIn64BitMode=x64
OutputDir=output
OutputBaseFilename=SaudiCord-Setup
Compression=lzma2
SolidCompression=yes
WizardStyle=modern
UninstallDisplayName=SaudiCord
UninstallFilesDir={localappdata}\Programs\SaudiCord
CloseApplications=yes
RestartApplications=no

[Files]
Source: "payload\node.exe"; DestDir: "{app}"; Flags: ignoreversion
Source: "payload\install.mjs"; DestDir: "{app}"; Flags: ignoreversion
Source: "payload\asar.mjs"; DestDir: "{app}"; Flags: ignoreversion
Source: "payload\saudicord.asar"; DestDir: "{app}"; Flags: ignoreversion

[Icons]
Name: "{autoprograms}\SaudiCord\إزالة SaudiCord"; Filename: "{uninstallexe}"

[Code]
procedure CurStepChanged(CurStep: TSetupStep);
var
    ResultCode: Integer;
begin
    if CurStep = ssPostInstall then begin
        if not Exec(ExpandConstant('{app}\node.exe'),
            '"' + ExpandConstant('{app}\install.mjs') + '" --branch stable',
            ExpandConstant('{app}'), SW_HIDE, ewWaitUntilTerminated, ResultCode) then
            RaiseException('تعذّر تشغيل مثبّت SaudiCord.');
        if ResultCode <> 0 then
            RaiseException('فشل تثبيت SaudiCord. أغلق Discord بالكامل ثم أعد تشغيل ملف التثبيت.');
        MsgBox('تم تثبيت SaudiCord بنجاح. أعد تشغيل Discord لتطبيق التغييرات.', mbInformation, MB_OK);
    end;
end;

procedure CurUninstallStepChanged(CurUninstallStep: TUninstallStep);
var
    ResultCode: Integer;
begin
    if CurUninstallStep = usUninstall then begin
        if not Exec(ExpandConstant('{app}\node.exe'),
            '"' + ExpandConstant('{app}\install.mjs') + '" --uninstall --branch stable',
            ExpandConstant('{app}'), SW_HIDE, ewWaitUntilTerminated, ResultCode) then
            RaiseException('تعذّر تشغيل أداة استعادة Discord. لم تتم إزالة ملفات SaudiCord.');
        if ResultCode <> 0 then
            RaiseException('تعذّرت استعادة Discord. أغلق Discord ثم أعد محاولة إزالة SaudiCord.');
        MsgBox('تمت إزالة SaudiCord واستعادة Discord الأصلي.', mbInformation, MB_OK);
    end;
end;
