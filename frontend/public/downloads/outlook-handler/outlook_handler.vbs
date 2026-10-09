' ==============================================================================
' dTS Instruments - Manejador de Protocolo Nativo dts-mail:// para Microsoft Outlook
' ==============================================================================
Option Explicit

On Error Resume Next

Dim rawUrl, action, idParam, fromParam, subjectParam, queryParam
If WScript.Arguments.Count = 0 Then WScript.Quit

rawUrl = WScript.Arguments(0)
rawUrl = Replace(rawUrl, """", "")

Dim urlWithoutProtocol, qPos
If InStr(LCase(rawUrl), "dts-mail://") = 1 Then
    urlWithoutProtocol = Mid(rawUrl, 12)
Else
    urlWithoutProtocol = rawUrl
End If

qPos = InStr(urlWithoutProtocol, "?")
If qPos > 0 Then
    action = LCase(Left(urlWithoutProtocol, qPos - 1))
    queryParam = Mid(urlWithoutProtocol, qPos + 1)
Else
    action = LCase(urlWithoutProtocol)
    queryParam = ""
End If

If Right(action, 1) = "/" Then action = Left(action, Len(action) - 1)

Function GetQueryParam(qs, paramName)
    Dim pairs, i, kv
    GetQueryParam = ""
    pairs = Split(qs, "&")
    For i = 0 To UBound(pairs)
        kv = Split(pairs(i), "=")
        If UBound(kv) >= 1 Then
            If LCase(kv(0)) = LCase(paramName) Then
                GetQueryParam = URLDecode(kv(1))
                Exit Function
            End If
        End If
    Next
End Function

Function URLDecode(str)
    Dim s
    s = Replace(str, "+", " ")
    On Error Resume Next
    Dim objDoc
    Set objDoc = CreateObject("HTMLFILE")
    If Not objDoc Is Nothing Then
        URLDecode = objDoc.parentWindow.unescape(s)
    Else
        URLDecode = s
    End If
    On Error GoTo 0
End Function

idParam = GetQueryParam(queryParam, "id")
fromParam = GetQueryParam(queryParam, "from")
subjectParam = GetQueryParam(queryParam, "subject")

Dim objOutlook, objNamespace, objMail, objExplorer, foundMail
Set objOutlook = Nothing

On Error Resume Next
Set objOutlook = GetObject(, "Outlook.Application")
If objOutlook Is Nothing Then
    Set objOutlook = CreateObject("Outlook.Application")
End If
On Error GoTo 0

If objOutlook Is Nothing Then
    MsgBox "No se pudo iniciar Microsoft Outlook.", vbExclamation, "dTS Instruments"
    WScript.Quit
End If

Set objNamespace = objOutlook.GetNamespace("MAPI")
objNamespace.Logon "", "", False, False

Select Case action
    Case "reply"
        foundMail = False
        If Len(idParam) > 0 Then
            On Error Resume Next
            Set objMail = objNamespace.GetItemFromID(idParam)
            If Not objMail Is Nothing Then
                Dim objReply
                Set objReply = objMail.ReplyAll()
                objReply.Display
                foundMail = True
            End If
            On Error GoTo 0
        End If
        
        If Not foundMail Then
            Dim objNewMail
            Set objNewMail = objOutlook.CreateItem(0)
            If Len(fromParam) > 0 Then objNewMail.To = fromParam
            If Len(subjectParam) > 0 Then
                If Left(LCase(subjectParam), 3) <> "re:" Then
                    objNewMail.Subject = "Re: " & subjectParam
                Else
                    objNewMail.Subject = subjectParam
                End If
            End If
            objNewMail.Display
        End If

    Case "search"
        Set objExplorer = objOutlook.ActiveExplorer
        If objExplorer Is Nothing Then
            Dim objInbox
            Set objInbox = objNamespace.GetDefaultFolder(6)
            Set objExplorer = objInbox.GetExplorer
            objExplorer.Display
        Else
            objExplorer.Activate
        End If
        
        Dim searchTerms
        searchTerms = ""
        If Len(fromParam) > 0 Then searchTerms = "de:" & fromParam & " "
        If Len(subjectParam) > 0 Then searchTerms = searchTerms & """" & subjectParam & """"
        If Len(searchTerms) > 0 Then
            objExplorer.Search Trim(searchTerms), 0
        End If

    Case Else
        foundMail = False
        If Len(idParam) > 0 Then
            On Error Resume Next
            Set objMail = objNamespace.GetItemFromID(idParam)
            If Not objMail Is Nothing Then
                objMail.Display
                foundMail = True
            End If
            On Error GoTo 0
        End If
        
        If Not foundMail Then
            Set objExplorer = objOutlook.ActiveExplorer
            If objExplorer Is Nothing Then
                Dim objInbox2
                Set objInbox2 = objNamespace.GetDefaultFolder(6)
                Set objExplorer = objInbox2.GetExplorer
                objExplorer.Display
            Else
                objExplorer.Activate
            End If
            
            Dim searchBackup
            searchBackup = ""
            If Len(fromParam) > 0 Then searchBackup = "de:" & fromParam & " "
            If Len(subjectParam) > 0 Then searchBackup = searchBackup & """" & subjectParam & """"
            If Len(searchBackup) > 0 Then
                objExplorer.Search Trim(searchBackup), 0
            End If
        End If
End Select
