import { isAxiosError } from 'axios';

export default function describeError(error: unknown): string {
  if (isAxiosError(error)) {
    return `${error.response?.status} ${JSON.stringify(error.response?.data)}`;
  }
  return String(error);
}