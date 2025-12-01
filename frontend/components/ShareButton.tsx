'use client';

import { useState } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { useRouter } from '@/i18n/routing';
import toast from 'react-hot-toast';
import { addLocalePrefix } from '@/lib/utils/locale';
import { debugLog } from '@/lib/utils/debug';
import { useUser } from '@/contexts/UserContext';
import { getShareOptionsForCountry } from '@/lib/utils/shareOptions';

interface ShareButtonProps {
  postId: string;
  postContent?: string;
  authorName?: string;
}

export default function ShareButton({
  postId,
  postContent,
  authorName,
}: ShareButtonProps) {
  const t = useTranslations('post');
  const locale = useLocale();
  const router = useRouter();
  const { user } = useUser();
  const [isShareMenuOpen, setIsShareMenuOpen] = useState(false);
  
  // Get share options based on user's country
  const shareOptions = getShareOptionsForCountry(user?.country);

  // Get the full URL of the post
  const getPostUrl = () => {
    const path = `/posts/${postId}`;
    const url = addLocalePrefix(path, locale);
    return typeof window !== 'undefined' ? `${window.location.origin}${url}` : '';
  };

  // Copy URL to clipboard
  const handleCopyUrl = async () => {
    try {
      const url = getPostUrl();
      await navigator.clipboard.writeText(url);
      toast.success(t('share.urlCopied'));
      setIsShareMenuOpen(false);
    } catch (error) {
      debugLog.error('Failed to copy URL:', error);
      toast.error(t('share.copyFailed'));
    }
  };

  // Share to Twitter/X
  const handleShareTwitter = () => {
    const url = getPostUrl();
    const text = postContent
      ? `${postContent.slice(0, 100)}${postContent.length > 100 ? '...' : ''}`
      : '';
    const twitterUrl = `https://twitter.com/intent/tweet?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}`;
    window.open(twitterUrl, '_blank', 'width=550,height=420');
    setIsShareMenuOpen(false);
  };

  // Share to Facebook
  const handleShareFacebook = () => {
    const url = getPostUrl();
    // Use Facebook Share URL (simpler and more reliable)
    const facebookUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`;
    window.open(facebookUrl, '_blank', 'width=550,height=420');
    setIsShareMenuOpen(false);
  };

  // Share to LINE
  const handleShareLINE = () => {
    const url = getPostUrl();
    const text = postContent
      ? `${postContent.slice(0, 100)}${postContent.length > 100 ? '...' : ''}`
      : '';
    const lineUrl = `https://social-plugins.line.me/lineit/share?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}`;
    window.open(lineUrl, '_blank', 'width=550,height=420');
    setIsShareMenuOpen(false);
  };

  // Share to KakaoTalk
  const handleShareKakaoTalk = () => {
    const url = getPostUrl();
    const text = postContent
      ? `${postContent.slice(0, 100)}${postContent.length > 100 ? '...' : ''}`
      : '';
    // KakaoTalk share URL format
    const kakaoUrl = `https://story.kakao.com/share?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}`;
    window.open(kakaoUrl, '_blank', 'width=550,height=420');
    setIsShareMenuOpen(false);
  };

  // Share to WeChat
  const handleShareWeChat = () => {
    const url = getPostUrl();
    // WeChat share requires QR code generation, so we'll copy the URL
    navigator.clipboard.writeText(url).then(() => {
      toast.success(t('share.urlCopied'));
    }).catch(() => {
      toast.error(t('share.copyFailed'));
    });
    setIsShareMenuOpen(false);
  };

  // Share to Weibo
  const handleShareWeibo = () => {
    const url = getPostUrl();
    const text = postContent
      ? `${postContent.slice(0, 100)}${postContent.length > 100 ? '...' : ''}`
      : '';
    const weiboUrl = `https://service.weibo.com/share/share.php?url=${encodeURIComponent(url)}&title=${encodeURIComponent(text)}`;
    window.open(weiboUrl, '_blank', 'width=550,height=420');
    setIsShareMenuOpen(false);
  };

  // Share via message
  const handleShareToMessage = async () => {
    try {
      // Copy URL to clipboard first
      const url = getPostUrl();
      await navigator.clipboard.writeText(url);
      
      // Navigate to messages page
      router.push('/messages');
      
      // Show toast notification
      toast.success(t('share.urlCopiedAndRedirected'));
    } catch (error) {
      debugLog.error('Failed to copy URL:', error);
      // Still navigate even if copy fails
      router.push('/messages');
      toast.info(t('share.redirectedToMessages'));
    }
    setIsShareMenuOpen(false);
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsShareMenuOpen(!isShareMenuOpen)}
        className="flex items-center space-x-2 text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
        aria-label={t('share.share')}
        title={t('share.share')}
      >
        <svg
          className="w-5 h-5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"
          />
        </svg>
        <span className="font-medium">{t('share.share')}</span>
      </button>

      {/* Share menu dropdown */}
      {isShareMenuOpen && (
        <>
          {/* Overlay to close menu */}
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsShareMenuOpen(false)}
          />
          {/* Menu */}
          <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 z-50">
            <div className="py-1">
              {shareOptions.map((option, index) => {
                // Add separator before message option
                const showSeparator = option.type === 'message' && index > 0;
                
                return (
                  <div key={option.type}>
                    {showSeparator && (
                      <div className="border-t border-gray-200 dark:border-gray-700 my-1" />
                    )}
                    
                    {option.type === 'copyUrl' && (
                      <button
                        onClick={handleCopyUrl}
                        className="w-full px-4 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center space-x-2"
                      >
                        <svg
                          className="w-5 h-5"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                          />
                        </svg>
                        <span>{t('share.copyUrl')}</span>
                      </button>
                    )}
                    
                    {option.type === 'twitter' && (
                      <button
                        onClick={handleShareTwitter}
                        className="w-full px-4 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center space-x-2"
                      >
                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                        </svg>
                        <span>{t('share.shareToTwitter')}</span>
                      </button>
                    )}
                    
                    {option.type === 'facebook' && (
                      <button
                        onClick={handleShareFacebook}
                        className="w-full px-4 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center space-x-2"
                      >
                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                        </svg>
                        <span>{t('share.shareToFacebook')}</span>
                      </button>
                    )}
                    
                    {option.type === 'line' && (
                      <button
                        onClick={handleShareLINE}
                        className="w-full px-4 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center space-x-2"
                      >
                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M19.365 9.863c.349 0 .63.285.63.631 0 .345-.281.63-.63.63H17.61v1.125h1.755c.349 0 .63.283.63.63 0 .344-.281.629-.63.629h-2.386c-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.63-.63h2.386c.348 0 .63.285.63.63 0 .349-.282.63-.63.63H17.61v1.125h1.755zm-3.855 3.016c0 .27-.174.51-.432.596-.064.021-.133.031-.199.031-.211 0-.391-.09-.51-.25l-2.443-3.317v2.94c0 .344-.279.629-.631.629-.346 0-.626-.285-.626-.629V8.108c0-.27.173-.51.43-.595.06-.023.136-.033.194-.033.195 0 .375.104.495.254l2.462 3.33V8.108c0-.345.282-.63.63-.63.345 0 .63.285.63.63v4.771zm-5.741 0c0 .344-.282.629-.631.629-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.63-.63.346 0 .628.285.628.63v4.771zm-2.466.629H4.917c-.345 0-.63-.285-.63-.629V8.108c0-.345.285-.63.63-.63.348 0 .63.285.63.63v4.141h1.756c.348 0 .629.283.629.63 0 .344-.282.629-.629.629M24 10.314C24 4.943 18.615.572 12 .572S0 4.943 0 10.314c0 4.811 4.27 8.842 10.035 9.608.391.082.923.258 1.058.59.12.301.079.766.057 1.08l-.164 1.02c-.045.301-.24 1.186 1.049.645 1.291-.539 6.916-4.078 9.436-6.975C23.176 14.393 24 12.458 24 10.314" />
                        </svg>
                        <span>{t('share.shareToLINE')}</span>
                      </button>
                    )}
                    
                    {option.type === 'kakaotalk' && (
                      <button
                        onClick={handleShareKakaoTalk}
                        className="w-full px-4 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center space-x-2"
                      >
                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M12 3c5.799 0 10.5 3.664 10.5 8.185 0 4.52-4.701 8.184-10.5 8.184a13.5 13.5 0 0 1-1.727-.11l-4.408 2.883c-.501.265-.678.236-.472-.413l.892-3.678c-2.88-1.46-4.785-3.99-4.785-6.866C1.5 6.665 6.201 3 12 3z" />
                        </svg>
                        <span>{t('share.shareToKakaoTalk')}</span>
                      </button>
                    )}
                    
                    {option.type === 'wechat' && (
                      <button
                        onClick={handleShareWeChat}
                        className="w-full px-4 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center space-x-2"
                      >
                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M8.691 2.188C3.891 2.188 0 5.476 0 9.53c0 2.212 1.17 4.203 3.002 5.55a.59.59 0 0 1 .213.665l-.39 1.48c-.019.07-.048.141-.048.213 0 .163.13.295.29.295a.326.326 0 0 0 .167-.054l1.903-1.114a.864.864 0 0 1 .717-.098 10.16 10.16 0 0 0 2.837.403c.276 0 .543-.027.811-.05-.857-2.578.157-4.972 1.932-6.446 1.703-1.415 3.882-1.98 5.853-1.838-.576-3.583-4.196-6.348-8.605-6.348zM5.785 5.991c.642 0 1.162.529 1.162 1.18a1.17 1.17 0 0 1-1.162 1.178A1.17 1.17 0 0 1 4.623 7.17c0-.651.52-1.18 1.162-1.18zm5.813 0c.642 0 1.162.529 1.162 1.18a1.17 1.17 0 0 1-1.162 1.178 1.17 1.17 0 0 1-1.162-1.179c0-.651.52-1.18 1.162-1.18zm5.34 3.336c-1.23 1.208-2.873 1.785-4.557 1.785a9.405 9.405 0 0 1-2.24-.27c.495-1.185 1.583-2.22 2.97-2.893 3.24-1.572 6.723-.676 7.76.902a6.488 6.488 0 0 0-.933-1.524c-1.253-1.312-2.88-1.94-4.555-1.94a7.77 7.77 0 0 0-1.945.248c.437-1.15 1.3-2.12 2.4-2.803 2.33-1.42 5.24-1.612 7.36-.43-1.062 1.482-3.374 2.73-5.7 2.73zm-1.034 2.677c.64 0 1.16.528 1.16 1.179a1.17 1.17 0 0 1-1.16 1.179 1.17 1.17 0 0 1-1.162-1.18c0-.65.52-1.178 1.162-1.178zm4.522 0c.641 0 1.161.528 1.161 1.179a1.17 1.17 0 0 1-1.161 1.179 1.17 1.17 0 0 1-1.162-1.18c0-.65.52-1.178 1.162-1.178z" />
                        </svg>
                        <span>{t('share.shareToWeChat')}</span>
                      </button>
                    )}
                    
                    {option.type === 'weibo' && (
                      <button
                        onClick={handleShareWeibo}
                        className="w-full px-4 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center space-x-2"
                      >
                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M9.869 11.57c-1.349 0-2.443-1.094-2.443-2.443s1.094-2.443 2.443-2.443 2.443 1.094 2.443 2.443-1.094 2.443-2.443 2.443zm4.262 0c-1.349 0-2.443-1.094-2.443-2.443s1.094-2.443 2.443-2.443 2.443 1.094 2.443 2.443-1.094 2.443-2.443 2.443zm4.262 0c-1.349 0-2.443-1.094-2.443-2.443s1.094-2.443 2.443-2.443 2.443 1.094 2.443 2.443-1.094 2.443-2.443 2.443zm-8.524 4.262c-3.314 0-6.005-2.691-6.005-6.005s2.691-6.005 6.005-6.005 6.005 2.691 6.005 6.005-2.691 6.005-6.005 6.005zm0-10.01c-2.21 0-4.005 1.795-4.005 4.005s1.795 4.005 4.005 4.005 4.005-1.795 4.005-4.005-1.795-4.005-4.005-4.005z" />
                        </svg>
                        <span>{t('share.shareToWeibo')}</span>
                      </button>
                    )}
                    
                    {option.type === 'message' && (
                      <button
                        onClick={handleShareToMessage}
                        className="w-full px-4 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center space-x-2"
                      >
                        <svg
                          className="w-5 h-5"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                          />
                        </svg>
                        <span>{t('share.shareToMessage')}</span>
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

