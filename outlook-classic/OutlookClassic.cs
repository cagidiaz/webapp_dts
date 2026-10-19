using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.Globalization;
using System.IO;
using System.Net;
using System.Net.Http;
using System.Runtime.InteropServices;
using System.Security.AccessControl;
using System.Security.Cryptography;
using System.Security.Principal;
using System.Text;
using System.Web.Script.Serialization;
using System.Windows.Forms;
using Microsoft.Win32;
using System.Reflection;

[assembly: AssemblyTitle("dTS Outlook Classic")]
[assembly: AssemblyCompany("dTS Instruments")]
[assembly: AssemblyProduct("dTS CRM Outlook Classic")]
[assembly: AssemblyVersion("1.1.1.0")]
[assembly: AssemblyFileVersion("1.1.1.0")]

namespace Dts.OutlookClassic {
  internal static class Program {
    const string Version = "1.1.1";
    const string Origin = "https://app.dtsinstruments.com";
    static readonly JavaScriptSerializer Json = new JavaScriptSerializer { MaxJsonLength = 131072 };
    static readonly string Root = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData), "dTS", "OutlookClassic");
    static readonly string DeviceFile = Path.Combine(Root, "device.dat");
    static readonly byte[] Entropy = Encoding.UTF8.GetBytes("dTS-OutlookClassic-device-v1");
    [STAThread] static int Main(string[] args) {
      try {
        ServicePointManager.SecurityProtocol = SecurityProtocolType.Tls12;
#if DEBUG
        if (args.Length == 1 && args[0] == "--self-test") { try { SelfTest(); return 0; } catch (Exception error) { Console.WriteLine("SELF_TEST_FAILED: "+error.GetType().Name+" "+error.HResult.ToString("X")); return 2; } }
        if (args.Length == 2 && args[0] == "--verify-reference") {
          try {
            var report=Json.Deserialize<Dictionary<string,object>>(File.ReadAllText(args[1]));
            if(S(report,"stage")!="phase0")throw new Exception("report");
            var mailbox=(Dictionary<string,object>)report["mailbox"];var message=(Dictionary<string,object>)report["message"];
            string result=OpenExact(S(message,"mapiEntryId"),S(mailbox,"email"),S(message,"internetMessageId"),false,DateTimeOffset.UtcNow.AddSeconds(60));
            Console.WriteLine(Json.Serialize(new { status=result=="opened"?"verified":result,mailDisplayed=false,registryModified=false }));
            return result=="opened"?0:2;
          } catch { Console.WriteLine("REFERENCE_TEST_FAILED");return 2; }
        }
#endif
        if (args.Length == 0 || (args.Length == 1 && args[0] == "--install")) { Install(); return 0; }
        if (args.Length == 1 && args[0] == "--pair") { Pair(); return 0; }
        if (args.Length == 1 && args[0] == "--uninstall") { Uninstall(); return 0; }
        if (args.Length != 1) throw new SafeError("Solicitud de apertura no válida.");
        if (IsLaunchProtocol(args[0])) { LaunchOutlook(); return 0; }
        string id, token; ParseProtocol(args[0], out id, out token);
        OpenRequest(id, token); return 0;
      } catch (SafeError error) { MessageBox.Show(error.Message,"dTS Outlook Classic",MessageBoxButtons.OK,MessageBoxIcon.Information); return 1; }
      catch { MessageBox.Show("No se pudo completar la operación. Comprueba la vinculación del equipo y utiliza Outlook Web si necesitas abrir el correo.","dTS Outlook Classic",MessageBoxButtons.OK,MessageBoxIcon.Warning); return 1; }
    }
    sealed class SafeError : Exception { public SafeError(string message) : base(message) {} }
    static string B64(byte[] value) { return Convert.ToBase64String(value).TrimEnd('=').Replace('+','-').Replace('/','_'); }
    static string RandomToken() { byte[] b=new byte[32]; using(var rng=RandomNumberGenerator.Create()) rng.GetBytes(b); return B64(b); }
    static string Sign(RSACryptoServiceProvider rsa,string text) { return B64(rsa.SignData(Encoding.UTF8.GetBytes(text),CryptoConfig.MapNameToOID("SHA256"))); }
    static string S(Dictionary<string,object> data,string key) { object value; return data.TryGetValue(key,out value) && value!=null ? Convert.ToString(value,CultureInfo.InvariantCulture) : ""; }
    static Dictionary<string,object> Post(string path,object body) {
      if (!path.StartsWith("/api/exchange-sync/classic/",StringComparison.Ordinal)) throw new SafeError("Destino de la solicitud no permitido.");
      using(var handler=new HttpClientHandler { AllowAutoRedirect=false }) using(var client=new HttpClient(handler)) {
        client.Timeout=TimeSpan.FromSeconds(25);
        var response=client.PostAsync(Origin+path,new StringContent(Json.Serialize(body),Encoding.UTF8,"application/json")).GetAwaiter().GetResult();
        if (!response.IsSuccessStatusCode) throw new SafeError("El CRM ha rechazado la solicitud. Puede haber caducado, estar ya utilizada o requerir una nueva vinculación del equipo.");
        string text=response.Content.ReadAsStringAsync().GetAwaiter().GetResult();
        return Json.Deserialize<Dictionary<string,object>>(text);
      }
    }
    // Launch-only operation: no arguments, mailbox access, message creation or network request.
    static bool IsLaunchProtocol(string raw) { return string.Equals(raw,"dts-outlook://v1/launch",StringComparison.Ordinal); }
    static void LaunchOutlook() {
      dynamic outlook=null,session=null,explorers=null,explorer=null,folder=null;
      try {
        try { outlook=Marshal.GetActiveObject("Outlook.Application"); }
        catch { var type=Type.GetTypeFromProgID("Outlook.Application");if(type==null)throw new SafeError("Outlook Classic no está instalado.");outlook=Activator.CreateInstance(type); }
        explorers=outlook.Explorers;
        if(explorers.Count>0) { explorer=explorers.Item(1);explorer.Activate(); }
        else { session=outlook.GetNamespace("MAPI");folder=session.GetDefaultFolder(6);explorer=folder.GetExplorer();explorer.Display(); }
      } finally { Release(explorer);Release(folder);Release(explorers);Release(session);Release(outlook); }
    }
    static void ParseProtocol(string raw,out string id,out string token) {
      Uri uri;
      if (raw.Length>1024 || !Uri.TryCreate(raw,UriKind.Absolute,out uri) || uri.Scheme!="dts-outlook" || uri.Host!="v1" || uri.AbsolutePath!="/open" || uri.UserInfo!="" || uri.Fragment!="" || uri.Port!=-1) throw new SafeError("Protocolo no válido.");
      var values=new Dictionary<string,string>(StringComparer.Ordinal);
      foreach(string pair in uri.Query.TrimStart('?').Split('&')) {
        var bits=pair.Split('=');
        if(bits.Length!=2 || (bits[0]!="request" && bits[0]!="token") || values.ContainsKey(bits[0])) throw new SafeError("Protocolo no válido.");
        values.Add(bits[0],bits[1]);
      }
      Guid parsed;
      if(values.Count!=2 || !values.TryGetValue("request",out id) || !Guid.TryParseExact(id,"D",out parsed) || !values.TryGetValue("token",out token) || !System.Text.RegularExpressions.Regex.IsMatch(token,"^[A-Za-z0-9_-]{43}$")) throw new SafeError("Protocolo no válido.");
      id=parsed.ToString("D");
    }
    static void SecureDirectory() {
      Directory.CreateDirectory(Root);
      var security=new DirectorySecurity(); security.SetAccessRuleProtection(true,false);
      var sid=WindowsIdentity.GetCurrent().User;
      security.SetOwner(sid);
      security.AddAccessRule(new FileSystemAccessRule(sid,FileSystemRights.FullControl,InheritanceFlags.ContainerInherit|InheritanceFlags.ObjectInherit,PropagationFlags.None,AccessControlType.Allow));
      security.AddAccessRule(new FileSystemAccessRule(new SecurityIdentifier(WellKnownSidType.LocalSystemSid,null),FileSystemRights.FullControl,InheritanceFlags.ContainerInherit|InheritanceFlags.ObjectInherit,PropagationFlags.None,AccessControlType.Allow));
      Directory.SetAccessControl(Root,security);
    }
    static void SaveDevice(string id,RSACryptoServiceProvider rsa) {
      SecureDirectory();
      var data=new Dictionary<string,object>{{"deviceId",id},{"privateKey",rsa.ToXmlString(true)}};
      byte[] encrypted=ProtectedData.Protect(Encoding.UTF8.GetBytes(Json.Serialize(data)),Entropy,DataProtectionScope.CurrentUser);
      File.WriteAllBytes(DeviceFile,encrypted);
    }
    static Dictionary<string,object> LoadDevice() {
      if(!File.Exists(DeviceFile)) throw new SafeError("Este usuario de Windows no tiene un equipo vinculado. Abre el componente de dTS para vincularlo.");
      byte[] clear=ProtectedData.Unprotect(File.ReadAllBytes(DeviceFile),Entropy,DataProtectionScope.CurrentUser);
      try { return Json.Deserialize<Dictionary<string,object>>(Encoding.UTF8.GetString(clear)); } finally { Array.Clear(clear,0,clear.Length); }
    }
    static void Pair() {
      Application.EnableVisualStyles();
      using(var rsa=new RSACryptoServiceProvider(2048,new CspParameters(24)) { PersistKeyInCsp=false }) {
        var key=rsa.ExportParameters(false); string n=B64(key.Modulus),e=B64(key.Exponent),nonce=RandomToken();
        string proof=Sign(rsa,string.Join("|",new string[]{"dts-pair-v1",nonce,n,e}));
        var started=Post("/api/exchange-sync/classic/pair/start",new { n=n,e=e,clientNonce=nonce,signature=proof,label=Environment.MachineName.Length>80?Environment.MachineName.Substring(0,80):Environment.MachineName });
        string pairing=S(started,"pairingId"),secret=S(started,"secret"),code=S(started,"code"),url=S(started,"approvalUrl");
        Guid pairGuid;
        if(!Guid.TryParse(pairing,out pairGuid) || url!=Origin+"/outlook-classic?pair="+pairGuid.ToString("D") || !System.Text.RegularExpressions.Regex.IsMatch(code,"^[A-F0-9]{10}$")) throw new SafeError("Respuesta de vinculación no válida.");
        using(var form=new Form { Text="Vincular dTS Outlook Classic",Width=520,Height=250,StartPosition=FormStartPosition.CenterScreen,FormBorderStyle=FormBorderStyle.FixedDialog,MaximizeBox=false,MinimizeBox=false }) {
          var label=new Label { Left=20,Top=18,Width=465,Height=40,Text="Abre el CRM e introduce este código para vincular únicamente este usuario de Windows:" };
          var text=new TextBox { Left=20,Top=65,Width=465,ReadOnly=true,Text=code.Substring(0,5)+"-"+code.Substring(5),Font=new System.Drawing.Font("Segoe UI",18) };
          var open=new Button { Left=20,Top=125,Width=220,Height=34,Text="Abrir CRM" };
          var check=new Button { Left=255,Top=125,Width=230,Height=34,Text="Ya he confirmado en el CRM" };
          open.Click+=(sender,args)=>Process.Start(new ProcessStartInfo(url) { UseShellExecute=true });
          check.Click+=(sender,args)=>{
            check.Enabled=false;
            try { var status=Post("/api/exchange-sync/classic/pair/"+pairGuid.ToString("D")+"/poll",new { secret=secret });
              if(S(status,"status")=="paired" && S(status,"deviceId")==pairGuid.ToString("D")) { SaveDevice(pairGuid.ToString("D"),rsa); MessageBox.Show("Equipo vinculado. Ya puedes volver al correo del CRM.","dTS Outlook Classic"); form.DialogResult=DialogResult.OK;form.Close(); }
              else MessageBox.Show("Todavía no se ha confirmado la vinculación en el CRM.","dTS Outlook Classic");
            } catch(SafeError error) { MessageBox.Show(error.Message,"dTS Outlook Classic"); } catch { MessageBox.Show("No se pudo comprobar la vinculación. Revisa la conexión e inténtalo de nuevo.","dTS Outlook Classic"); } finally { check.Enabled=true; }
          };
          form.Controls.AddRange(new Control[]{label,text,open,check});form.ShowDialog();
        }
      }
    }
    static Dictionary<string,object> Proof(string action,string requestId,string token,string deviceId,RSACryptoServiceProvider rsa,string outcome,string claimNonce) {
      string timestamp=((long)(DateTime.UtcNow-new DateTime(1970,1,1,0,0,0,DateTimeKind.Utc)).TotalMilliseconds).ToString(CultureInfo.InvariantCulture),nonce=RandomToken();
      string canonical=string.Join("|",new string[]{"dts-classic-v1",action,requestId,deviceId,token,timestamp,nonce,Version,outcome,claimNonce});
      var proof=new Dictionary<string,object>{{"deviceId",deviceId},{"token",token},{"timestamp",timestamp},{"nonce",nonce},{"version",Version},{"signature",Sign(rsa,canonical)}};
      if(action=="result") { proof["outcome"]=outcome;proof["claimNonce"]=claimNonce; }
      return proof;
    }
    static void OpenRequest(string id,string token) {
      var device=LoadDevice();
      using(var rsa=new RSACryptoServiceProvider(new CspParameters(24)) { PersistKeyInCsp=false }) {
        rsa.FromXmlString(S(device,"privateKey"));
        string deviceId=S(device,"deviceId");Guid deviceGuid;if(!Guid.TryParseExact(deviceId,"D",out deviceGuid))throw new SafeError("Vinculación local no válida.");
        var command=Post("/api/exchange-sync/classic/requests/"+id+"/claim",Proof("claim",id,token,deviceId,rsa,"",""));
        DateTimeOffset expiry;
        if(!AllowedAction(S(command,"action")) || !DateTimeOffset.TryParse(S(command,"expiresAt"),CultureInfo.InvariantCulture,DateTimeStyles.None,out expiry) || expiry<DateTimeOffset.UtcNow || expiry>DateTimeOffset.UtcNow.AddMinutes(2)) throw new SafeError("La solicitud ha caducado.");
        string outcome=OpenExact(S(command,"entryId"),S(command,"mailboxEmail"),S(command,"internetMessageId"),true,expiry,S(command,"action"));
        try { Post("/api/exchange-sync/classic/requests/"+id+"/result",Proof("result",id,token,deviceId,rsa,outcome,S(command,"claimNonce"))); }
        catch { if(outcome=="opened") throw new SafeError("Classic ha mostrado la ventana solicitada, pero no se pudo confirmar al CRM. Comprueba la ventana antes de volver a abrirlo."); throw; }
        if(outcome!="opened") throw new SafeError("No se ha abierto el correo: "+outcome+". No se ha buscado otro mensaje por asunto. Puedes utilizar Outlook Web.");
      }
    }
    static bool AllowedAction(string action) { return action=="open" || action=="reply" || action=="reply_all"; }
    static string OpenExact(string entryId,string email,string internetId,bool display,DateTimeOffset expiry,string action="open") {
      if(!AllowedAction(action))return "identity_mismatch";
      if(!System.Text.RegularExpressions.Regex.IsMatch(entryId,"^(?:[0-9A-Fa-f]{2})+$") || entryId.Length>32768 || email.Length==0 || internetId.Length==0) return "identity_mismatch";
      dynamic outlook=null,session=null,accounts=null,mail=null,property=null,response=null;
      try {
        try { outlook=Marshal.GetActiveObject("Outlook.Application"); } catch { var type=Type.GetTypeFromProgID("Outlook.Application");if(type==null)return "classic_not_available";outlook=Activator.CreateInstance(type); }
        session=outlook.GetNamespace("MAPI");accounts=session.Accounts;
        var stores=new List<string>();
        for(int i=1;i<=accounts.Count;i++) { dynamic account=null,store=null;try { account=accounts.Item(i);if(string.Equals((string)account.SmtpAddress,email,StringComparison.OrdinalIgnoreCase)) { store=account.DeliveryStore;if(store!=null)stores.Add((string)store.StoreID); } } finally { Release(store);Release(account); } }
        if(stores.Count!=1)return "mailbox_not_available";
        try { mail=session.GetItemFromID(entryId,stores[0]); } catch { return "not_found"; }
        if(mail==null || (int)mail.Class!=43)return "identity_mismatch";
        property=mail.PropertyAccessor;string actual;
        try { actual=(string)property.GetProperty("http://schemas.microsoft.com/mapi/proptag/0x1035001F"); } catch { actual=(string)property.GetProperty("http://schemas.microsoft.com/mapi/proptag/0x1035001E"); }
        if(!string.Equals(actual,internetId,StringComparison.Ordinal))return "identity_mismatch";
        if(DateTimeOffset.UtcNow>=expiry)return "error";
        if(display) {
          if(action=="open")mail.Display(false);
          else { response=action=="reply_all"?mail.ReplyAll():mail.Reply();response.Display(false); }
        }
        return "opened";
      } catch { return outlook==null?"classic_not_available":"error"; }
      finally { Release(response);Release(property);Release(mail);Release(accounts);Release(session);Release(outlook); }
    }
    static void Release(object value) { if(value!=null && Marshal.IsComObject(value))Marshal.ReleaseComObject(value); }
    static void Install() {
      SecureDirectory();string folder=Path.Combine(Root,Version);Directory.CreateDirectory(folder);
      string destination=Path.Combine(folder,"dTS.OutlookClassic.exe");
      if(!string.Equals(Path.GetFullPath(Application.ExecutablePath),Path.GetFullPath(destination),StringComparison.OrdinalIgnoreCase))File.Copy(Application.ExecutablePath,destination,true);
      using(var key=Registry.CurrentUser.CreateSubKey(@"Software\Classes\dts-outlook")) {
        key.SetValue("", "URL:dTS Outlook Classic");key.SetValue("URL Protocol", "");
        using(var command=key.CreateSubKey(@"shell\open\command"))command.SetValue("", "\""+destination+"\" "+"\"%1\"");
      }
      if(!File.Exists(DeviceFile))Process.Start(new ProcessStartInfo(destination,"--pair") { UseShellExecute=false });
      else MessageBox.Show("Componente actualizado. La vinculación del equipo se conserva.","dTS Outlook Classic");
    }
    static void Uninstall() {
      string command="";using(var key=Registry.CurrentUser.OpenSubKey(@"Software\Classes\dts-outlook\shell\open\command")) { if(key!=null)command=Convert.ToString(key.GetValue("")); }
      if(command.StartsWith("\""+Root+Path.DirectorySeparatorChar,StringComparison.OrdinalIgnoreCase))Registry.CurrentUser.DeleteSubKeyTree(@"Software\Classes\dts-outlook",false);
      if(File.Exists(DeviceFile))File.Delete(DeviceFile);
      MessageBox.Show("Protocolo y clave local retirados. Revoca también el equipo desde el CRM. Los ejecutables de versiones anteriores pueden eliminarse después de cerrar este componente.","dTS Outlook Classic");
    }
#if DEBUG
    static void SelfTest() {
      if(!IsLaunchProtocol("dts-outlook://v1/launch") || IsLaunchProtocol("dts-outlook://v1/launch?subject=x") || IsLaunchProtocol("dts-outlook://v1/launch#x"))throw new Exception("launch parser");
      if(!AllowedAction("open")||!AllowedAction("reply")||!AllowedAction("reply_all")||AllowedAction("send"))throw new Exception("action");
      string id,token;string request="00000000-0000-4000-8000-000000000001",secret=RandomToken();
      ParseProtocol("dts-outlook://v1/open?request="+request+"&token="+secret,out id,out token);
      if(id!=request||token!=secret)throw new Exception("parser");
      foreach(string invalid in new string[]{"https://evil.invalid", "dts-outlook://v1/open?request="+request+"&token="+secret+"&subject=x", "dts-outlook://evil/open?request="+request+"&token="+secret}) { bool rejected=false;try{ParseProtocol(invalid,out id,out token);}catch{rejected=true;}if(!rejected)throw new Exception("invalid parser"); }
      using(var rsa=new RSACryptoServiceProvider(2048,new CspParameters(24)){PersistKeyInCsp=false}) {
        var key=rsa.ExportParameters(false);string n=B64(key.Modulus),e=B64(key.Exponent),nonce=RandomToken();
        string canonical=string.Join("|",new string[]{"dts-pair-v1",nonce,n,e});
        byte[] clear=Encoding.UTF8.GetBytes("ephemeral-self-test");byte[] encrypted=ProtectedData.Protect(clear,Entropy,DataProtectionScope.CurrentUser);
        if(Encoding.UTF8.GetString(ProtectedData.Unprotect(encrypted,Entropy,DataProtectionScope.CurrentUser))!="ephemeral-self-test")throw new Exception("dpapi");
        Console.WriteLine(Json.Serialize(new { status="PASS",n=n,e=e,clientNonce=nonce,canonical=canonical,signature=Sign(rsa,canonical),claimProof=Proof("claim",request,secret,request,rsa,"",""),resultProof=Proof("result",request,secret,request,rsa,"opened",nonce),registryModified=false,mailOpened=false }));
      }
    }
#endif
  }
}
