'use client';

import { useAuth0 } from '@auth0/auth0-react';
import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { blockUser, unblockUser, checkBlockStatus, BlockStatus } from '@/lib/api/users';
import { Ban } from 'lucide-react';

interface BlockButtonProps {
  userId: string;
  onBlockChange?: (isBlocked: boolean) => void;
  className?: string;
}

export default function BlockButton({
  userId,
  onBlockChange,
  className = '',
}: BlockButtonProps) {
  const { getAccessTokenSilently, isAuthenticated, loginWithRedirect } = useAuth0();
  const t = useTranslations('blockButton');
  const [blockStatus, setBlockStatus] = useState<BlockStatus | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isChecking, setIsChecking] = useState(true);

  // Check initial block status
  useEffect(() => {
    const checkStatus = async () => {
      if (!isAuthenticated || !userId) {
        setIsChecking(false);
        return;
      }

      try {
        const accessToken = await getAccessTokenSilently();
        const status = await checkBlockStatus(accessToken, userId);
        setBlockStatus(status);
      } catch (error) {
        console.error('Failed to check block status:', error);
        // Default to not blocked if check fails
        setBlockStatus({
          is_blocked: false,
          is_blocked_by: false,
          are_blocked: false,
        });
      } finally {
        setIsChecking(false);
      }
    };

    checkStatus();
  }, [userId, isAuthenticated, getAccessTokenSilently]);

  const handleBlockToggle = async () => {
    if (!isAuthenticated) {
      loginWithRedirect();
      return;
    }

    if (!blockStatus) return;

    setIsLoading(true);

    try {
      const accessToken = await getAccessTokenSilently();

      if (blockStatus.is_blocked) {
        await unblockUser(accessToken, userId);
        setBlockStatus({
          ...blockStatus,
          is_blocked: false,
          are_blocked: false,
        });
        onBlockChange?.(false);
      } else {
        await blockUser(accessToken, userId);
        setBlockStatus({
          ...blockStatus,
          is_blocked: true,
          are_blocked: true,
        });
        onBlockChange?.(true);
      }
    } catch (error: any) {
      console.error('Failed to toggle block:', error);
      // Show error to user
      alert(error.message || t('errors.updateFailed'));
    } finally {
      setIsLoading(false);
    }
  };

  // Don't show button if checking status or if user is blocked by this user
  if (isChecking || !blockStatus) {
    return null;
  }

  // Don't show block button if current user is blocked by this user
  if (blockStatus.is_blocked_by) {
    return null;
  }

  return (
    <button
      onClick={handleBlockToggle}
      disabled={isLoading}
      className={`flex flex-col md:flex-row items-center justify-center px-3 py-2 md:px-4 md:py-2 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
        blockStatus.is_blocked
          ? 'bg-red-100 text-red-700 hover:bg-red-200 dark:bg-red-900/20 dark:text-red-400 dark:hover:bg-red-900/30'
          : 'bg-red-600 text-white hover:bg-red-700 dark:bg-red-500 dark:hover:bg-red-600'
      } ${className}`}
      title={blockStatus.is_blocked ? t('unblock') : t('block')}
    >
      {isLoading ? (
        <>
          <svg
            className="animate-spin h-5 w-5 md:h-4 md:w-4 mb-1 md:mb-0 md:mr-2"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
          <span className="hidden md:inline text-xs md:text-sm">{t('processing')}</span>
        </>
      ) : (
        <>
          <Ban className="h-5 w-5 md:h-4 md:w-4 mb-1 md:mb-0 md:mr-2" />
          <span className="hidden md:inline text-xs md:text-sm">
            {blockStatus.is_blocked ? t('unblock') : t('block')}
          </span>
        </>
      )}
    </button>
  );
}




