import React, { useEffect, useRef } from 'react';
import { Platform, View } from 'react-native';
import { WebView, WebViewMessageEvent } from 'react-native-webview';

interface PaymentWebViewProps {
  /** Raw Razorpay checkout HTML (from generateCheckoutHTML). */
  html: string;
  /** Receives { nativeEvent: { data } } with the JSON payload string. */
  onMessage: (event: WebViewMessageEvent) => void;
  style?: any;
  startInLoadingState?: boolean;
  renderLoading?: () => React.ReactElement;
}

/**
 * Razorpay checkout host that works on every platform:
 *  - native (iOS/Android): react-native-webview
 *  - web (Expo web preview): an iframe with a postMessage bridge — the
 *    generated HTML falls back to window.parent.postMessage when
 *    ReactNativeWebView is unavailable (see razorpayService).
 */
export default function PaymentWebView(props: PaymentWebViewProps) {
  if (Platform.OS !== 'web') {
    return (
      <WebView
        source={{ html: props.html, baseUrl: 'https://loanex.app' }}
        style={props.style}
        originWhitelist={['*']}
        javaScriptEnabled
        domStorageEnabled
        onMessage={props.onMessage}
        startInLoadingState={props.startInLoadingState}
        renderLoading={props.renderLoading}
      />
    );
  }
  return <WebRazorpayIframe html={props.html} onMessage={props.onMessage} style={props.style} />;
}

function WebRazorpayIframe({
  html,
  onMessage,
  style,
}: {
  html: string;
  onMessage: (event: WebViewMessageEvent) => void;
  style?: any;
}) {
  // Keep the latest handler without re-binding the window listener.
  const handlerRef = useRef(onMessage);
  handlerRef.current = onMessage;

  useEffect(() => {
    const listener = (event: MessageEvent) => {
      if (typeof event.data !== 'string') return;
      // Only forward messages that look like our JSON payloads.
      try {
        JSON.parse(event.data);
      } catch {
        return;
      }
      handlerRef.current?.({ nativeEvent: { data: event.data } } as any);
    };
    window.addEventListener('message', listener);
    return () => window.removeEventListener('message', listener);
  }, []);

  // react-native-web renders unknown host elements as real DOM nodes, so an
  // iframe works in the Expo web preview. Cast keeps TS happy in RN projects.
  const Iframe = 'iframe' as any;

  return (
    <View style={[{ flex: 1 }, style]}>
      <Iframe
        srcDoc={html}
        title="Razorpay Checkout"
        style={{ width: '100%', height: '100%', border: 'none' }}
        sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox"
      />
    </View>
  );
}
