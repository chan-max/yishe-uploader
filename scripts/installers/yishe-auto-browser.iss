#define MyAppName "Yishe Auto Browser"
#ifndef AppVersion
  #define AppVersion "0.0.0"
#endif
#ifndef ReleaseDir
  #error ReleaseDir not defined
#endif
#ifndef OutputDir
  #define OutputDir "."
#endif
#ifndef OutputBaseFilename
  #define OutputBaseFilename "yishe-auto-browser-windows-setup"
#endif
#ifndef AppExeName
  #define AppExeName "yishe-uploader.exe"
#endif
#ifndef InstallerLanguageName
  #define InstallerLanguageName "english"
#endif
#ifndef InstallerMessagesFile
  #define InstallerMessagesFile "compiler:Default.isl"
#endif

[Setup]
AppId={{6C6B86F1-8C95-4A5D-8F5B-4B3E5BB4A4D1}
AppName={#MyAppName}
AppVersion={#AppVersion}
AppPublisher=Jc
DefaultDirName={localappdata}\Programs\Yishe Auto Browser
DefaultGroupName=Yishe Auto Browser
UninstallDisplayIcon={app}\{#AppExeName}
Compression=lzma2/ultra64
SolidCompression=yes
ArchitecturesAllowed=x64compatible
ArchitecturesInstallIn64BitMode=x64compatible
PrivilegesRequired=lowest
OutputDir={#OutputDir}
OutputBaseFilename={#OutputBaseFilename}
WizardStyle=modern
SetupLogging=yes
DisableProgramGroupPage=yes

[Languages]
Name: "{#InstallerLanguageName}"; MessagesFile: "{#InstallerMessagesFile}"

[Tasks]
Name: "desktopicon"; Description: "创建桌面快捷方式"; GroupDescription: "附加任务:"; Flags: unchecked

[Files]
Source: "{#ReleaseDir}\*"; DestDir: "{app}"; Flags: ignoreversion recursesubdirs createallsubdirs

[Icons]
Name: "{autoprograms}\Yishe Auto Browser"; Filename: "{app}\{#AppExeName}"
Name: "{autodesktop}\Yishe Auto Browser"; Filename: "{app}\{#AppExeName}"; Tasks: desktopicon

[Run]
Filename: "{app}\{#AppExeName}"; Description: "启动 Yishe Auto Browser"; Flags: nowait postinstall skipifsilent
