import abi from '../../contracts/abi.json';

export const contractAddress = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS as `0x${string}` | undefined;
export const contractAbi = abi;
export const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL;
export const baseSepoliaChainId = 84532;

