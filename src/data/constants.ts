import { ModelInfo } from '../../shared/types';

export const MODELS: ModelInfo[] = [
    { id: 'claude', name: 'Claude', shortName: 'Claude', color: '#D97757', logo: '🟠', wallet: '0x9DC9dbBB720646b35af320B896AAC23877710cB1', polymarketUrl: 'https://polymarket.com/profile/0x9DC9dbBB720646b35af320B896AAC23877710cB1' },
    { id: 'chatgpt', name: 'ChatGPT', shortName: 'ChatGPT', color: '#10A37F', logo: '🟢', wallet: '0x90aDA1Cf0b689E737Bed7A91fdE950F93deBA04D', polymarketUrl: 'https://polymarket.com/profile/0x90aDA1Cf0b689E737Bed7A91fdE950F93deBA04D' },
    { id: 'gemini', name: 'Gemini', shortName: 'Gemini', color: '#4285F4', logo: '🔵', wallet: '0xE80B261824eeba03a56F7d46E570De5464DA0E1C', polymarketUrl: 'https://polymarket.com/profile/0xE80B261824eeba03a56F7d46E570De5464DA0E1C' },
    { id: 'grok', name: 'Grok', shortName: 'Grok', color: '#1D1D1F', logo: '⚫', wallet: '0xC209F22Cb1C10E9327ab7cC88fb07740b3a555AD', polymarketUrl: 'https://polymarket.com/profile/0xC209F22Cb1C10E9327ab7cC88fb07740b3a555AD' },
    { id: 'deepseek', name: 'DeepSeek', shortName: 'DeepSeek', color: '#4D6BFE', logo: '🟣', wallet: '0xd1Ffc695d2C75bc7708E439aa870aC917791c3f9', polymarketUrl: 'https://polymarket.com/profile/0xd1Ffc695d2C75bc7708E439aa870aC917791c3f9' },
];

// Per-agent donor configuration.
// proxyWallet  = address shown on polymarket.com/profile (used by WS events + REST polling)
// onchainWallet = EOA signer on Polygon (optional, for faster on-chain pre-detection)
//
// To have ALL 5 agents copy the same donor — set the same proxyWallet for all entries:
//   { agentId: 'claude',   proxyWallet: '0xYOUR_DONOR_WALLET', onchainWallet: '' },
//   { agentId: 'chatgpt',  proxyWallet: '0xYOUR_DONOR_WALLET', onchainWallet: '' },
//   ... (same address for all 5)
//
// To have each agent copy a different donor — set different proxyWallet per entry.
// Leave proxyWallet as '' to disable copying for that agent.
export const AGENT_DONORS: { agentId: string; proxyWallet: string; onchainWallet: string }[] = [
    { agentId: 'claude', proxyWallet: '', onchainWallet: '' },
    { agentId: 'chatgpt', proxyWallet: '', onchainWallet: '' },
    { agentId: 'gemini', proxyWallet: '', onchainWallet: '' },
    { agentId: 'grok', proxyWallet: '', onchainWallet: '' },
    { agentId: 'deepseek', proxyWallet: '', onchainWallet: '' },
];

// Derived flat arrays (used by onChainListener and other modules)
export const DONOR_WALLETS: string[] = AGENT_DONORS
    .map(d => d.proxyWallet)
    .filter(w => /^0x[0-9a-fA-F]{40}$/.test(w));

export const DONOR_ONCHAIN_WALLETS: string[] = AGENT_DONORS
    .map(d => d.onchainWallet)
    .filter(w => /^0x[0-9a-fA-F]{40}$/.test(w));

export const COIN_MAP: Record<string, string> = {
    'BTC': 'BTC',
    'ETH': 'ETH',
    'XRP': 'XRP',
    'SOL': 'SOL',
};
