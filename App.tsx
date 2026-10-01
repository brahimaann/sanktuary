import { useCallback, useEffect, useRef, useState } from 'react';
import { Button, FlatList, KeyboardAvoidingView, Pressable, SafeAreaView, StyleSheet, Text, TextInput, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { ClerkProvider, useAuth, useClerk, useSignIn } from '@clerk/expo';
import { tokenCache } from '@clerk/expo/token-cache';

const API = process.env.EXPO_PUBLIC_API_URL || 'https://sanktuary.studio';

type Msg = { id: string; user: string; at: string; text: string };
type Room = { id: string; title: string };

/** fetch against the sanktuary-OS server with the Clerk session token, which it accepts as a Bearer header. */
function useApi() {
  const { getToken } = useAuth();
  return useCallback(
    async (path: string, init: RequestInit = {}) => {
      const res = await fetch(API + path, {
        ...init,
        headers: { authorization: `Bearer ${await getToken()}`, 'content-type': 'application/json', ...init.headers },
      });
      if (!res.ok) throw new Error((await res.text()) || `HTTP ${res.status}`);
      return res.json();
    },
    [getToken],
  );
}

/** Nickname + access code, then a code when Clerk wants a new device confirmed (same flow as the web's teamLogin.ts). */
function SignIn() {
  const { signIn } = useSignIn();
  const [nick, setNick] = useState('');
  const [pass, setPass] = useState('');
  const [code, setCode] = useState('');
  const [kind, setKind] = useState<'email' | 'phone' | 'totp' | null>(null);
  const [note, setNote] = useState('');

  const finish = async () => {
    const done = await signIn.finalize();
    if (done.error) setNote(done.error.longMessage || done.error.message);
  };

  const login = async () => {
    setNote('');
    const { error } = await signIn.password({ identifier: nick.trim(), password: pass });
    if (error) return setNote(error.longMessage || error.message);
    if (signIn.status === 'complete') return finish();
    const has = (s: string) => signIn.supportedSecondFactors?.some((f) => f.strategy === s);
    const r = has('email_code') ? await signIn.mfa.sendEmailCode() : has('phone_code') ? await signIn.mfa.sendPhoneCode() : null;
    if (r?.error) return setNote(r.error.longMessage || r.error.message);
    setKind(has('email_code') ? 'email' : has('phone_code') ? 'phone' : 'totp');
    setNote(has('totp') && !r ? 'Enter the code from your authenticator app.' : 'New device check: enter the code we sent you.');
  };

  const verify = async () => {
    const c = code.trim();
    const r =
      kind === 'phone'
        ? await signIn.mfa.verifyPhoneCode({ code: c })
        : kind === 'totp'
          ? await signIn.mfa.verifyTOTP({ code: c })
          : await signIn.mfa.verifyEmailCode({ code: c });
    if (r.error) return setNote(r.error.longMessage || r.error.message);
    finish();
  };

  return (
    <View style={s.pad}>
      <Text style={s.h1}>Sanktuary</Text>
      {kind ? (
        <>
          <TextInput style={s.input} placeholder="Code" value={code} onChangeText={setCode} keyboardType="number-pad" />
          <Button title="Confirm" onPress={verify} />
        </>
      ) : (
        <>
          <TextInput style={s.input} placeholder="Nickname" value={nick} onChangeText={setNick} autoCapitalize="none" />
          <TextInput style={s.input} placeholder="Access code" value={pass} onChangeText={setPass} secureTextEntry />
          <Button title="Log in" onPress={login} />
        </>
      )}
      {!!note && <Text style={s.note}>{note}</Text>}
    </View>
  );
}

function Rooms({ open }: { open: (r: Room) => void }) {
  const api = useApi();
  const { signOut } = useClerk();
  const [rooms, setRooms] = useState<Room[]>([]);
  const [error, setError] = useState('');

  useEffect(() => {
    api('/api/chat')
      .then((d: { channels: { id: string; name: string }[]; dms: { id: string; with: string }[] }) =>
        setRooms([...d.channels.map((c) => ({ id: c.id, title: '#' + c.name })), ...d.dms.map((m) => ({ id: m.id, title: '@' + m.with }))]),
      )
      .catch((e) => setError(String(e.message)));
  }, [api]);

  return (
    <View style={s.fill}>
      <View style={s.bar}>
        <Text style={s.h1}>Teams</Text>
        <Button title="Log out" onPress={() => signOut()} />
      </View>
      {!!error && <Text style={s.note}>{error}</Text>}
      <FlatList
        data={rooms}
        keyExtractor={(r) => r.id}
        renderItem={({ item }) => (
          <Pressable style={s.row} onPress={() => open(item)}>
            <Text style={s.rowText}>{item.title}</Text>
          </Pressable>
        )}
      />
    </View>
  );
}

function Chat({ room, back }: { room: Room; back: () => void }) {
  const api = useApi();
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [text, setText] = useState('');
  const path = `/api/chat/${encodeURIComponent(room.id)}`;

  // ponytail: polls every 4 s; switch to the /api/live event stream if that ever feels slow.
  const load = useCallback(() => api(path).then(setMsgs).catch(() => {}), [api, path]);
  useEffect(() => {
    load();
    const t = setInterval(load, 4000);
    return () => clearInterval(t);
  }, [load]);

  const send = async () => {
    if (!text.trim()) return;
    setText('');
    await api(path, { method: 'POST', body: JSON.stringify({ text }) });
    load();
  };

  const list = useRef<FlatList<Msg>>(null);
  return (
    <KeyboardAvoidingView style={s.fill} behavior="padding">
      <View style={s.bar}>
        <Button title="‹ Back" onPress={back} />
        <Text style={s.h1}>{room.title}</Text>
      </View>
      <FlatList
        ref={list}
        data={msgs}
        keyExtractor={(m) => m.id}
        onContentSizeChange={() => list.current?.scrollToEnd()}
        renderItem={({ item }) => (
          <Text style={s.msg}>
            <Text style={s.bold}>{item.user} </Text>
            {item.text}
          </Text>
        )}
      />
      <View style={s.bar}>
        <TextInput style={[s.input, s.fill]} value={text} onChangeText={setText} placeholder="Message" onSubmitEditing={send} />
        <Button title="Send" onPress={send} />
      </View>
    </KeyboardAvoidingView>
  );
}

function Main() {
  const { isLoaded, isSignedIn } = useAuth();
  const [room, setRoom] = useState<Room | null>(null);
  if (!isLoaded) return null;
  if (!isSignedIn) return <SignIn />;
  return room ? <Chat room={room} back={() => setRoom(null)} /> : <Rooms open={setRoom} />;
}

export default function App() {
  return (
    <ClerkProvider publishableKey={process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY!} tokenCache={tokenCache}>
      <SafeAreaView style={s.fill}>
        <Main />
      </SafeAreaView>
      <StatusBar style="auto" />
    </ClerkProvider>
  );
}

const s = StyleSheet.create({
  fill: { flex: 1 },
  pad: { flex: 1, padding: 24, justifyContent: 'center', gap: 12 },
  h1: { fontSize: 22, fontWeight: '700' },
  input: { borderWidth: 1, borderColor: '#999', borderRadius: 6, padding: 10 },
  note: { color: '#b00', padding: 12 },
  bar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8, padding: 12 },
  row: { padding: 16, borderBottomWidth: StyleSheet.hairlineWidth, borderColor: '#ccc' },
  rowText: { fontSize: 17 },
  msg: { paddingHorizontal: 12, paddingVertical: 4, fontSize: 15 },
  bold: { fontWeight: '700' },
});
