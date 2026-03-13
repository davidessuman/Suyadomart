import React from 'react';
import { View, Text, TouchableOpacity, useWindowDimensions } from 'react-native';

type Props = {
  colors: any;
  notificationPrefs: Record<string, boolean>;
  choosingKey: string | null;
  setChoosingKey: (k: string | null) => void;
  setNotificationPrefs: (fn: (prev: Record<string, boolean>) => Record<string, boolean>) => void;
  computedFontSize?: number;
  savingNotifications: boolean;
  setSavingNotifications: (v: boolean) => void;
  session?: any;
};

export default function NotificationSection({
  colors,
  notificationPrefs,
  choosingKey,
  setChoosingKey,
  setNotificationPrefs,
  computedFontSize,
  savingNotifications,
  setSavingNotifications,
  session,
}: Props) {
  const { width } = useWindowDimensions();
  // keep controls on the same row for most small screens; only stack on very narrow screens
  const tiny = width <= 320;
  const compact = width <= 420;
  const containerPadding = compact ? 12 : 16;
  const gap = compact ? 10 : 14;
  const labelFont = computedFontSize && computedFontSize > 0 ? Math.max(13, Math.min(20, computedFontSize)) : Math.max(13, Math.round(width / 32));
  // reduce control minWidth to help fit buttons alongside text on smaller widths
  const controlMin = tiny ? 48 : compact ? 72 : 96;

  const options = [
    { key: 'push', label: 'Push Notifications' },
    { key: 'email', label: 'Email Notifications' },
  ];

  return (
    <View style={{ marginHorizontal: 20, marginBottom: 18, backgroundColor: colors.card, borderRadius: 14, padding: containerPadding, borderWidth: 1, borderColor: colors.border }}>
      <View style={{ backgroundColor: colors.inputBg, borderRadius: 12, padding: containerPadding }}>
        {options.map((opt) => {
          const enabled = !!notificationPrefs[opt.key];
          const choosing = choosingKey === opt.key;

          return (
            <View key={opt.key} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: gap, flexWrap: 'nowrap' }}>
              <Text
                numberOfLines={1}
                ellipsizeMode="tail"
                allowFontScaling
                minimumFontScale={0.6}
                style={{ color: colors.text, fontSize: labelFont, flex: 1, marginRight: 12 }}
              >
                {opt.label}
              </Text>

              <View style={{ minWidth: controlMin, alignItems: 'flex-end', overflow: 'hidden' }}>
                {choosing ? (
                  <View style={{ flexDirection: 'row' }}>
                    <TouchableOpacity
                      onPress={() => {
                        setNotificationPrefs((p) => ({ ...p, [opt.key]: true }));
                        setChoosingKey(null);
                      }}
                      activeOpacity={0.85}
                      style={{ backgroundColor: colors.success, paddingVertical: 6, paddingHorizontal: 10, borderRadius: 8, marginRight: 6 }}
                    >
                      <Text style={{ color: 'white', fontWeight: '700', fontSize: Math.max(12, labelFont - 2) }}>Enable</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => {
                        setNotificationPrefs((p) => ({ ...p, [opt.key]: false }));
                        setChoosingKey(null);
                      }}
                      activeOpacity={0.85}
                      style={{ backgroundColor: colors.primary, paddingVertical: 6, paddingHorizontal: 10, borderRadius: 8 }}
                    >
                      <Text style={{ color: 'white', fontWeight: '700', fontSize: Math.max(12, labelFont - 2) }}>Disable</Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  <TouchableOpacity
                    onPress={() => setChoosingKey(opt.key)}
                    activeOpacity={0.9}
                    style={{
                      paddingVertical: 6,
                      paddingHorizontal: 10,
                      borderRadius: 8,
                      backgroundColor: enabled ? colors.success : colors.primary,
                      minWidth: controlMin,
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Text style={{ color: 'white', fontWeight: '700', fontSize: Math.max(12, labelFont - 2) }}>{enabled ? 'Enabled' : 'Disabled'}</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          );
        })}

        <View style={{ marginTop: 6 }}>
          <TouchableOpacity
            activeOpacity={0.9}
            onPress={async () => {
              if (!session?.user) return;
              setSavingNotifications(true);
              try {
                // TODO: persist to backend (Supabase or other)
              } finally {
                setSavingNotifications(false);
              }
            }}
            style={{ backgroundColor: colors.primary, borderRadius: 10, paddingVertical: 8, alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.08, shadowRadius: 12, elevation: 6 }}
          >
            <Text style={{ color: 'white', fontWeight: '700', fontSize: Math.max(13, labelFont - 1) }}>Save Preferences</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}
