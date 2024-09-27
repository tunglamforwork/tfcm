import { ResponseData } from '@/types/res';
import { type ClassValue, clsx } from 'clsx';
import { toast } from 'sonner';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
	return twMerge(clsx(inputs));
}

export function generateFallback(str: string) {
	if (!str) return 'NN';

	const splittedStr = str.split(' ');
	if (splittedStr.length === 1) {
		return splittedStr[0].slice(0, 2).toUpperCase();
	} else if (splittedStr.length > 1) {
		return `${splittedStr[0][0] + splittedStr[1][0]}`.toUpperCase();
	} else {
		return 'NN';
	}
}

export const sleep = (ms: number) =>
	new Promise((resolve) => setTimeout(resolve, ms));

export const apiWrapper = <T extends ResponseData>(
	f: () => Promise<T>,
	onSuccess: (res: T) => void,
	onError?: () => void,
	errorMessage?: string
) => {
	f()
		.then((res) => {
			if (res.success) {
				onSuccess(res);
			} else {
				if (onError) onError();
				toast.error(
					errorMessage ? errorMessage + ': ' + res.error : res.error
				);
			}
		})
		.catch((err) => {
			if (onError) onError();
			toast.error(
				errorMessage ? errorMessage + ': ' + err : err
			);
		});
};
