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

[Run]
Filename: "{app}\node.exe"; Parameters: """{app}\install.mjs"" --branch stable"; Flags: runhidden waituntilterminated postinstall; StatusMsg: "جارٍ تثبيت SaudiCord على Discord..."

[UninstallRun]
Filename: "{app}\node.exe"; Parameters: """{app}\install.mjs"" --uninstall --branch stable"; Flags: runhidden waituntilterminated; RunOnceId: "SaudiCordRestoreDiscord"
