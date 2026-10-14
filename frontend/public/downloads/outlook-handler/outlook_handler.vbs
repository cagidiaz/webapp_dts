`' ==============================================================================
' dTS Instruments - Manejador de Protocolo Nativo dts-mail:// para Microsoft Outlook
' Version 2.2 - Limpieza total de tipologias CRM y busqueda por nucleo de asunto
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

' Decodificador de URL nativo
Function URLDecode(s)
    On Error Resume Next
    Dim res, i, ch, hCode
    res = ""
    i = 1
    Do While i <= Len(s)
        ch = Mid(s, i, 1)
        If ch = "+" Then
            res = res & " "
            i = i + 1
        ElseIf ch = "%" And i + 2 <= Len(s) Then
            hCode = Mid(s, i + 1, 2)
            res = res & Chr(CInt("&H" & hCode))
            If Err.Number <> 0 Then
                res = res & ch
                Err.Clear
                i = i + 1
            Else
                i = i + 3
            End If
        Else
            res = res & ch
            i = i + 1
        End If
    Loop
    URLDecode = res
End Function

Function GetQueryParam(qs, paramName)
    On Error Resume Next
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

Function CleanSubjectString(s)
    On Error Resume Next
    Dim res, pClose
    res = Trim(s)
    
    ' Eliminar corchetes iniciales de tipologia CRM ej. [📥 Recibido · 📋 Petición oferta] o [ðŸ“¥...]
    If InStr(res, "[") = 1 Then
        pClose = InStr(res, "]")
        If pClose > 0 Then
            res = Trim(Mid(res, pClose + 1))
        End If
    End If
    
    ' Normalizar guiones tipograficos y caracteres mojibake
    res = Replace(res, ChrW(8211), "-")
    res = Replace(res, ChrW(8212), "-")
    res = Replace(res, "â€”", "-")
    res = Replace(res, "â€“", "-")
    res = Replace(res, "—", "-")
    res = Replace(res, "–", "-")
    
    ' Limpiar prefijos de respuesta y reenvio
    Do
        Dim changed
        changed = False
        If LCase(Left(res, 4)) = "re: " Or LCase(Left(res, 4)) = "rv: " Or LCase(Left(res, 4)) = "re:" Then
            res = Trim(Mid(res, InStr(res, ":") + 1))
            changed = True
        ElseIf LCase(Left(res, 5)) = "fwd: " Or LCase(Left(res, 5)) = "fwd:" Then
            res = Trim(Mid(res, InStr(res, ":") + 1))
            changed = True
        End If
    Loop While changed
    
    CleanSubjectString = res
End Function

Function ExtractCoreSubject(s)
    On Error Resume Next
    Dim res
    res = CleanSubjectString(s)
    ' Si el asunto contiene " - dTS Instruments" o sufijo similar, obtener la parte principal
    If InStr(res, " - ") > 0 Then
        res = Trim(Left(res, InStr(res, " - ") - 1))
    End If
    ExtractCoreSubject = res
End Function

idParam = Trim(GetQueryParam(queryParam, "id"))
fromParam = Trim(GetQueryParam(queryParam, "from"))
subjectParam = Trim(GetQueryParam(queryParam, "subject"))

Dim objOutlook, objNamespace
Set objOutlook = Nothing

Set objOutlook = GetObject(, "Outlook.Application")
If objOutlook Is Nothing Then
    Set objOutlook = CreateObject("Outlook.Application")
End If

If objOutlook Is Nothing Then
    MsgBox "No se pudo iniciar Microsoft Outlook en este equipo.", vbExclamation, "dTS Instruments"
    WScript.Quit
End If

Set objNamespace = objOutlook.GetNamespace("MAPI")
objNamespace.Logon "", "", False, False

Sub FocusWindow(objItem)
    On Error Resume Next
    If objItem Is Nothing Then Exit Sub
    objItem.Display
    Dim insp
    Set insp = objItem.GetInspector
    If Not insp Is Nothing Then insp.Activate
    Dim wsh
    Set wsh = CreateObject("WScript.Shell")
    wsh.AppActivate objItem.Subject
    wsh.AppActivate "Outlook"
End Sub

Function FindMailInFolder(folder, rawSub, cleanSub, coreSub, emailFilter)
    On Error Resume Next
    Set FindMailInFolder = Nothing
    If folder Is Nothing Then Exit Function
    
    Dim items, item, countChecked
    Set items = folder.Items
    
    ' 1. Intentar busqueda indexada rapida si hay asunto
    Dim escapedSub
    If Len(cleanSub) > 0 Then
        escapedSub = Replace(cleanSub, "'", "''")
        Set item = items.Find("[Subject] = '" & escapedSub & "'")
        If Not item Is Nothing Then
            Set FindMailInFolder = item
            Exit Function
        End If
        Set item = items.Find("[Subject] = 'Re: " & escapedSub & "'")
        If Not item Is Nothing Then
            Set FindMailInFolder = item
            Exit Function
        End If
    End If

    If Len(coreSub) > 0 And coreSub <> cleanSub Then
        escapedSub = Replace(coreSub, "'", "''")
        Set item = items.Find("[Subject] = '" & escapedSub & "'")
        If Not item Is Nothing Then
            Set FindMailInFolder = item
            Exit Function
        End If
        Set item = items.Find("[Subject] = 'Re: " & escapedSub & "'")
        If Not item Is Nothing Then
            Set FindMailInFolder = item
            Exit Function
        End If
    End If
    
    ' 2. Recorrido seguro de los elementos mas recientes
    Set item = items.GetLast()
    countChecked = 0
    Do While Not item Is Nothing And countChecked < 300
        countChecked = countChecked + 1
        
        Dim itmSub, itmSender, itmTo, itmCC
        itmSub = ""
        itmSender = ""
        itmTo = ""
        itmCC = ""
        
        itmSub = item.Subject
        itmSender = item.SenderEmailAddress
        itmTo = item.To
        itmCC = item.CC
        
        Dim matchSub, matchEmail
        matchSub = False
        matchEmail = False
        
        If Len(coreSub) >= 4 Then
            If InStr(1, itmSub, coreSub, 1) > 0 Or InStr(1, itmSub, cleanSub, 1) > 0 Then
                matchSub = True
            End If
        ElseIf Len(cleanSub) > 0 Then
            If InStr(1, itmSub, cleanSub, 1) > 0 Then
                matchSub = True
            End If
        Else
            matchSub = True
        End If
        
        If Len(emailFilter) > 0 Then
            If InStr(1, itmSender, emailFilter, 1) > 0 Or _
               InStr(1, itmTo, emailFilter, 1) > 0 Or _
               InStr(1, itmCC, emailFilter, 1) > 0 Then
                matchEmail = True
            End If
        Else
            matchEmail = True
        End If
        
        If matchSub And matchEmail Then
            Set FindMailInFolder = item
            Exit Function
        End If
        
        If matchSub And Len(coreSub) >= 8 And Len(emailFilter) = 0 Then
            Set FindMailInFolder = item
            Exit Function
        End If
        
        Set item = items.GetPrevious()
    Loop
End Function

Dim targetMail
Set targetMail = Nothing

' 1. Intentar por EntryID directo si existe y es valido en MAPI
If Len(idParam) > 0 Then
    Set targetMail = objNamespace.GetItemFromID(idParam)
End If

' 2. Si no se encontro por ID, buscar en Entrada y Enviados
Dim cleanSubText, coreSubText
cleanSubText = CleanSubjectString(subjectParam)
coreSubText = ExtractCoreSubject(subjectParam)

If targetMail Is Nothing And (Len(cleanSubText) > 0 Or Len(fromParam) > 0) Then
    Dim inboxFolder, sentFolder
    Set inboxFolder = objNamespace.GetDefaultFolder(6)  ' olFolderInbox
    Set sentFolder = objNamespace.GetDefaultFolder(5)   ' olFolderSentMail
    
    Set targetMail = FindMailInFolder(inboxFolder, subjectParam, cleanSubText, coreSubText, fromParam)
    
    If targetMail Is Nothing Then
        Set targetMail = FindMailInFolder(sentFolder, subjectParam, cleanSubText, coreSubText, fromParam)
    End If
End If

' 3. Procesar segun accion solicitada
Select Case action
    Case "reply"
        If Not targetMail Is Nothing Then
            Dim replyMail
            Set replyMail = targetMail.ReplyAll()
            FocusWindow replyMail
        Else
            Dim newMail
            Set newMail = objOutlook.CreateItem(0)
            If Len(fromParam) > 0 Then newMail.To = fromParam
            If Len(cleanSubText) > 0 Then
                newMail.Subject = "Re: " & cleanSubText
            End If
            FocusWindow newMail
        End If

    Case "search"
        Dim searchExp
        Set searchExp = objOutlook.ActiveExplorer
        If searchExp Is Nothing Then
            Dim searchInbox
            Set searchInbox = objNamespace.GetDefaultFolder(6)
            Set searchExp = searchInbox.GetExplorer
            searchExp.Display
        Else
            searchExp.Activate
        End If
        
        Dim searchCriteria
        searchCriteria = ""
        If Len(coreSubText) > 0 Then
            searchCriteria = """" & coreSubText & """"
        ElseIf Len(cleanSubText) > 0 Then
            searchCriteria = """" & cleanSubText & """"
        End If
        If Len(fromParam) > 0 Then
            If Len(searchCriteria) > 0 Then
                searchCriteria = searchCriteria & " " & fromParam
            Else
                searchCriteria = fromParam
            End If
        End If
        
        If Len(searchCriteria) > 0 Then
            searchExp.Search Trim(searchCriteria), 1 ' 1 = olSearchScopeAllFolders
        End If
        
        Dim wshSearch
        Set wshSearch = CreateObject("WScript.Shell")
        wshSearch.AppActivate "Outlook"

    Case Else ' Accion "open" por defecto
        If Not targetMail Is Nothing Then
            FocusWindow targetMail
        Else
            ' Si no se encontro como item exacto, abrir el explorador de Outlook con busqueda limpia
            Dim mainExp
            Set mainExp = objOutlook.ActiveExplorer
            If mainExp Is Nothing Then
                Dim defInbox
                Set defInbox = objNamespace.GetDefaultFolder(6)
                Set mainExp = defInbox.GetExplorer
                mainExp.Display
            Else
                mainExp.Activate
            End If
            
            Dim backupCriteria
            backupCriteria = ""
            If Len(coreSubText) > 0 Then
                backupCriteria = """" & coreSubText & """"
            ElseIf Len(cleanSubText) > 0 Then
                backupCriteria = """" & cleanSubText & """"
            End If
            If Len(fromParam) > 0 Then
                If Len(backupCriteria) > 0 Then
                    backupCriteria = backupCriteria & " " & fromParam
                Else
                    backupCriteria = fromParam
                End If
            End If
            
            If Len(backupCriteria) > 0 Then
                mainExp.Search Trim(backupCriteria), 1 ' 1 = olSearchScopeAllFolders
            End If
            
            Dim wshOpen
            Set wshOpen = CreateObject("WScript.Shell")
            wshOpen.AppActivate "Outlook"
        End If
End Select
`