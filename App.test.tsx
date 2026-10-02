import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';

const mockAuth = { isLoaded: true, isSignedIn: false, getToken: jest.fn(async () => 'tok') };
const mockSignOut = jest.fn();
const mockSignIn: any = {};

jest.mock('@clerk/expo', () => ({
  ClerkProvider: ({ children }: any) => children,
  useAuth: () => mockAuth,
  useClerk: () => ({ signOut: mockSignOut }),
  useSignIn: () => ({ signIn: mockSignIn }),
}));
jest.mock('@clerk/expo/token-cache', () => ({ tokenCache: {} }));

import App from './App';

const ok = (body: unknown) => Promise.resolve({ ok: true, json: async () => body, text: async () => '' });
let routes: Record<string, (init?: any) => any>;
const fetchMock = jest.fn((url: string, init?: any) => {
  const key = `${init?.method || 'GET'} ${url.replace('https://sanktuary.studio', '')}`;
  return routes[key] ? routes[key](init) : Promise.reject(new Error('unrouted ' + key));
});
(globalThis as any).fetch = fetchMock;

beforeEach(() => {
  jest.clearAllMocks();
  Object.assign(mockAuth, { isLoaded: true, isSignedIn: false });
  Object.assign(mockSignIn, {
    status: 'needs_second_factor',
    supportedSecondFactors: [],
    password: jest.fn(async () => ({ error: null })),
    finalize: jest.fn(async () => ({ error: null })),
    mfa: {
      sendEmailCode: jest.fn(async () => ({ error: null })),
      sendPhoneCode: jest.fn(async () => ({ error: null })),
      verifyEmailCode: jest.fn(async () => ({ error: null })),
      verifyPhoneCode: jest.fn(async () => ({ error: null })),
      verifyTOTP: jest.fn(async () => ({ error: null })),
    },
  });
  routes = {
    'GET /api/chat': () => ok({ channels: [{ id: 'c1', name: 'general' }], dms: [{ id: 'd1', with: 'sam' }] }),
    'GET /api/chat/c1': () => ok([{ id: 'm1', user: 'sam', at: '', text: 'hello there' }]),
    'POST /api/chat/c1': () => ok({}),
  };
});

describe('loading', () => {
  it('renders nothing until Clerk is loaded', () => {
    mockAuth.isLoaded = false;
    render(<App />);
    expect(screen.queryByText('Sanktuary')).toBeNull();
    expect(screen.queryByText('Teams')).toBeNull();
  });
});

describe('sign in', () => {
  const login = (nick = '  neo ', pass = 'secret') => {
    render(<App />);
    fireEvent.changeText(screen.getByPlaceholderText('Nickname'), nick);
    fireEvent.changeText(screen.getByPlaceholderText('Access code'), pass);
    fireEvent.press(screen.getByText('Log in'));
  };

  it('trims nickname and finalizes when password alone completes', async () => {
    mockSignIn.status = 'complete';
    login();
    await waitFor(() => expect(mockSignIn.finalize).toHaveBeenCalled());
    expect(mockSignIn.password).toHaveBeenCalledWith({ identifier: 'neo', password: 'secret' });
  });

  it('shows the Clerk error on a bad password', async () => {
    mockSignIn.password.mockResolvedValue({ error: { message: 'x', longMessage: 'Password is incorrect.' } });
    login();
    expect(await screen.findByText('Password is incorrect.')).toBeTruthy();
    expect(mockSignIn.finalize).not.toHaveBeenCalled();
  });

  it('new device: sends email code, verifies it, finalizes', async () => {
    mockSignIn.supportedSecondFactors = [{ strategy: 'email_code' }];
    login();
    expect(await screen.findByText('New device check: enter the code we sent you.')).toBeTruthy();
    expect(mockSignIn.mfa.sendEmailCode).toHaveBeenCalled();
    fireEvent.changeText(screen.getByPlaceholderText('Code'), ' 123456 ');
    fireEvent.press(screen.getByText('Confirm'));
    await waitFor(() => expect(mockSignIn.finalize).toHaveBeenCalled());
    expect(mockSignIn.mfa.verifyEmailCode).toHaveBeenCalledWith({ code: '123456' });
  });

  it('new device: phone code path', async () => {
    mockSignIn.supportedSecondFactors = [{ strategy: 'phone_code' }];
    login();
    fireEvent.changeText(await screen.findByPlaceholderText('Code'), '42');
    fireEvent.press(screen.getByText('Confirm'));
    await waitFor(() => expect(mockSignIn.mfa.verifyPhoneCode).toHaveBeenCalledWith({ code: '42' }));
  });

  it('authenticator app (TOTP) path', async () => {
    mockSignIn.supportedSecondFactors = [{ strategy: 'totp' }];
    login();
    expect(await screen.findByText('Enter the code from your authenticator app.')).toBeTruthy();
    fireEvent.changeText(screen.getByPlaceholderText('Code'), '999');
    fireEvent.press(screen.getByText('Confirm'));
    await waitFor(() => expect(mockSignIn.mfa.verifyTOTP).toHaveBeenCalledWith({ code: '999' }));
  });

  it('wrong verification code shows error and does not finalize', async () => {
    mockSignIn.supportedSecondFactors = [{ strategy: 'email_code' }];
    mockSignIn.mfa.verifyEmailCode.mockResolvedValue({ error: { message: 'Incorrect code' } });
    login();
    fireEvent.changeText(await screen.findByPlaceholderText('Code'), '1');
    fireEvent.press(screen.getByText('Confirm'));
    expect(await screen.findByText('Incorrect code')).toBeTruthy();
    expect(mockSignIn.finalize).not.toHaveBeenCalled();
  });
});

describe('signed in', () => {
  beforeEach(() => (mockAuth.isSignedIn = true));

  it('lists channels and DMs using the Bearer token', async () => {
    render(<App />);
    expect(await screen.findByText('#general')).toBeTruthy();
    expect(screen.getByText('@sam')).toBeTruthy();
    expect(fetchMock.mock.calls[0][1].headers.authorization).toBe('Bearer tok');
  });

  it('shows server error text when rooms fail to load', async () => {
    routes['GET /api/chat'] = () => Promise.resolve({ ok: false, status: 500, text: async () => 'boom' });
    render(<App />);
    expect(await screen.findByText('boom')).toBeTruthy();
  });

  it('log out calls Clerk mockSignOut', async () => {
    render(<App />);
    fireEvent.press(screen.getByText('Log out'));
    expect(mockSignOut).toHaveBeenCalled();
  });

  it('opens a room, shows messages, sends, goes back', async () => {
    render(<App />);
    fireEvent.press(await screen.findByText('#general'));
    expect(await screen.findByText(/hello there/)).toBeTruthy();

    fireEvent.press(screen.getByText('Send')); // empty: ignored
    fireEvent.changeText(screen.getByPlaceholderText('Message'), 'hi all');
    fireEvent.press(screen.getByText('Send'));
    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith(expect.stringContaining('/api/chat/c1'), expect.objectContaining({ method: 'POST' })));
    const posts = fetchMock.mock.calls.filter(([, i]) => i?.method === 'POST');
    expect(posts).toHaveLength(1);
    expect(JSON.parse(posts[0][1].body)).toEqual({ text: 'hi all' });
    expect(screen.getByPlaceholderText('Message').props.value).toBe('');

    fireEvent.press(screen.getByText('‹ Back'));
    expect(await screen.findByText('Teams')).toBeTruthy();
  });

  it('polls the open room every 4 s and stops after leaving', async () => {
    const setI = jest.spyOn(globalThis, 'setInterval');
    const clearI = jest.spyOn(globalThis, 'clearInterval');
    render(<App />);
    fireEvent.press(await screen.findByText('#general'));
    await screen.findByText(/hello there/);
    const call = setI.mock.calls.findIndex(([, ms]) => ms === 4000);
    expect(call).toBeGreaterThanOrEqual(0);
    const id = setI.mock.results[call].value;
    fireEvent.press(screen.getByText('‹ Back'));
    await screen.findByText('Teams');
    expect(clearI).toHaveBeenCalledWith(id);
  });

  it('a failed send keeps the typed message and shows the error', async () => {
    routes['POST /api/chat/c1'] = () => Promise.resolve({ ok: false, status: 403, text: async () => 'not a member' });
    render(<App />);
    fireEvent.press(await screen.findByText('#general'));
    await screen.findByText(/hello there/);
    fireEvent.changeText(screen.getByPlaceholderText('Message'), 'important note');
    fireEvent.press(screen.getByText('Send'));
    expect(await screen.findByText('not a member')).toBeTruthy();
    expect(screen.getByPlaceholderText('Message').props.value).toBe('important note');
  });

  it('shows chat load errors instead of going quietly stale', async () => {
    routes['GET /api/chat/c1'] = () => Promise.resolve({ ok: false, status: 401, text: async () => 'session expired' });
    render(<App />);
    fireEvent.press(await screen.findByText('#general'));
    expect(await screen.findByText('session expired')).toBeTruthy();
  });
});
