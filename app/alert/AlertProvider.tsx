import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
// Use a DOM portal on web so alerts render above other modals
let ReactDOM: any = null;
if (Platform.OS === 'web') {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  ReactDOM = require('react-dom');
}
import { Ionicons } from '@expo/vector-icons';
import { useColorScheme } from 'react-native';

// Color themes (copy from your theme definitions)
const lightColors = {
  card: '#FFFFFF',
  text: '#1A1A1A',
  border: '#EEEEEE',
  inputBackground: '#F8F9FA',
  inputBorder: '#E1E1E1',
  success: '#34C759',
  error: '#FF3B30',
  warning: '#FFA500',
  info: '#007AFF',
  primary: '#FF9900',
  modalOverlay: 'rgba(0, 0, 0, 0.7)',
};
const darkColors = {
  ...lightColors,
  card: '#181818',
  text: '#FFFFFF',
  border: '#333333',
  inputBackground: '#222',
  inputBorder: '#333',
  modalOverlay: 'rgba(0, 0, 0, 0.7)',
};

export type AlertType = 'success' | 'error' | 'warning' | 'info' | 'confirm';
export interface AlertData {
  id: string;
  title: string;
  message: string;
  type: AlertType;
  confirmText?: string;
  cancelText?: string;
  onConfirm?: () => void;
  onCancel?: () => void;
  onClose?: () => void;
  // Optional theme can be provided to match caller's modal/theme styling
  theme?: any;
}

interface AlertContextType {
  showAlert: (data: Omit<AlertData, 'id'>) => void;
  showConfirmation: (data: Omit<AlertData, 'id' | 'type'>) => void;
}

const AlertContext = createContext<AlertContextType | undefined>(undefined);

export const useAlert = () => {
  const context = useContext(AlertContext);
  if (!context) throw new Error('useAlert must be used within AlertProvider');
  return context;
};

export const AlertProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const colorScheme = useColorScheme();
  const themeColors = colorScheme === 'dark' ? darkColors : lightColors;
  const [alerts, setAlerts] = useState<AlertData[]>([]);
  const [currentAlert, setCurrentAlert] = useState<AlertData | null>(null);

  const showAlert = useCallback((data: Omit<AlertData, 'id'>) => {
    const id = Date.now().toString();
    const newAlert: AlertData = { ...data, id };
    setAlerts(prev => [...prev, newAlert]);
  }, []);

  const showConfirmation = useCallback((data: Omit<AlertData, 'id' | 'type'>) => {
    showAlert({ ...data, type: 'confirm' });
  }, [showAlert]);

  const removeAlert = useCallback((id: string) => {
    setAlerts(prev => prev.filter(alert => alert.id !== id));
    setCurrentAlert(null);
  }, []);

  useEffect(() => {
    if (!currentAlert && alerts.length > 0) {
      setCurrentAlert(alerts[0]);
    }
  }, [currentAlert, alerts]);

  const getAlertStyles = (type: AlertType) => {
    switch (type) {
      case 'success':
        return { backgroundColor: themeColors.success, icon: 'checkmark-circle' };
      case 'error':
        return { backgroundColor: themeColors.error, icon: 'close-circle' };
      case 'warning':
        return { backgroundColor: themeColors.warning, icon: 'warning' };
      case 'confirm':
        // Use a calm, professional blue tone for confirmations (e.g. logout)
        return { backgroundColor: themeColors.info, icon: 'help-circle' };
      default:
        return { backgroundColor: themeColors.info, icon: 'information-circle' };
    }
  };

  const handleClose = useCallback((alert: AlertData) => {
    alert.onClose?.();
    removeAlert(alert.id);
  }, [removeAlert]);

  const handleConfirm = useCallback((alert: AlertData) => {
    alert.onConfirm?.();
    removeAlert(alert.id);
  }, [removeAlert]);

  const handleCancel = useCallback((alert: AlertData) => {
    alert.onCancel?.();
    removeAlert(alert.id);
  }, [removeAlert]);

  const portalTheme = currentAlert?.theme || themeColors;

  return (
    <AlertContext.Provider value={{ showAlert, showConfirmation }}>
      {children}
      {Platform.OS === 'web' ? (
        // Render portal content directly into document.body so it sits above other modals
        ReactDOM && currentAlert
          ? ReactDOM.createPortal(
              <div style={{ position: 'fixed', inset: 0, display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 2147483647, backgroundColor: portalTheme.modalOverlay }}>
                <div style={{ width: '100%', maxWidth: 400, borderRadius: 16, overflow: 'hidden', boxShadow: '0 8px 24px rgba(0,0,0,0.3)', backgroundColor: portalTheme.modalBackground || portalTheme.card }}>
                  <div style={{ display: 'flex', alignItems: 'center', padding: 20, gap: 12, backgroundColor: getAlertStyles(currentAlert.type).backgroundColor }}>
                    <Ionicons name={getAlertStyles(currentAlert.type).icon as any} size={32} color="#FFF" />
                    <div style={{ fontSize: 20, fontWeight: 700, color: '#FFF', flex: 1 }}>{currentAlert.title}</div>
                  </div>
                  <div style={{ padding: 20 }}>
                    <div style={{ color: portalTheme.text || themeColors.text, fontSize: 16, lineHeight: '24px', textAlign: 'center' }}>{currentAlert.message}</div>
                  </div>
                  <div style={{ display: 'flex', borderTop: `1px solid ${portalTheme.border || themeColors.border}`, padding: 16, gap: 12 }}>
                    {currentAlert.type === 'confirm' ? (
                      <>
                        <button
                          style={{
                            flex: 1,
                            padding: '14px',
                            background: portalTheme.surface || themeColors.surface,
                            border: `1px solid ${portalTheme.border || themeColors.border}`,
                            cursor: 'pointer',
                            borderRadius: 10,
                          }}
                          onClick={() => handleCancel(currentAlert)}
                        >
                          <span style={{ color: portalTheme.text || themeColors.text }}>{currentAlert.cancelText || 'Cancel'}</span>
                        </button>
                        <button
                          style={{
                            flex: 1,
                            padding: '14px',
                            background: portalTheme.primary || themeColors.primary,
                            color: '#000',
                            border: 'none',
                            cursor: 'pointer',
                            borderRadius: 10,
                          }}
                          onClick={() => handleConfirm(currentAlert)}
                        >
                          <span style={{ fontWeight: 600 }}>{currentAlert.confirmText || 'OK'}</span>
                        </button>
                      </>
                    ) : (
                      <button
                        style={{
                          width: '100%',
                          padding: '14px',
                          background: portalTheme.primary || themeColors.primary,
                          color: '#000',
                          border: 'none',
                          cursor: 'pointer',
                          borderRadius: 10,
                        }}
                        onClick={() => handleClose(currentAlert)}
                      >
                        OK
                      </button>
                    )}
                  </div>
                </div>
              </div>,
              document.body
            )
          : null
      ) : (
        <Modal
          visible={!!currentAlert}
          transparent
          animationType="fade"
          statusBarTranslucent
          presentationStyle="overFullScreen"
          onRequestClose={() => currentAlert && handleClose(currentAlert)}
        >
          <View style={[styles.overlay, { backgroundColor: portalTheme.modalOverlay, zIndex: 99999 }]}> 
            <View style={[styles.container, { backgroundColor: portalTheme.modalBackground || portalTheme.card, zIndex: 100000, borderColor: portalTheme.border || themeColors.border }]}> 
              {currentAlert && (
                <>
                  <View style={[styles.header, { backgroundColor: getAlertStyles(currentAlert.type).backgroundColor }]}> 
                    <Ionicons 
                      name={getAlertStyles(currentAlert.type).icon as any} 
                      size={32} 
                      color="#FFF" 
                    />
                    <Text style={styles.title}>{currentAlert.title}</Text>
                  </View>
                  <View style={styles.content}>
                    <Text style={[styles.message, { color: portalTheme.text || themeColors.text }]}>{currentAlert.message}</Text>
                  </View>
                  <View style={[styles.actions, { borderTopColor: portalTheme.border || themeColors.border }]}> 
                    {currentAlert.type === 'confirm' ? (
                      <>
                        <TouchableOpacity
                          style={[styles.button, styles.cancelButton, { backgroundColor: portalTheme.surface || themeColors.surface, borderColor: portalTheme.border || themeColors.border }]}
                          onPress={() => handleCancel(currentAlert)}
                        >
                          <Text style={[styles.buttonText, styles.cancelButtonText, { color: portalTheme.text || themeColors.text }]}>
                            {currentAlert.cancelText || 'Cancel'}
                          </Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={[styles.button, styles.confirmButton, { backgroundColor: portalTheme.primary || themeColors.primary }]}
                          onPress={() => handleConfirm(currentAlert)}
                        >
                          <Text style={[styles.buttonText, styles.confirmButtonText, { color: '#000' }]}>
                            {currentAlert.confirmText || 'OK'}
                          </Text>
                        </TouchableOpacity>
                      </>
                    ) : (
                      <TouchableOpacity
                        style={[styles.button, { backgroundColor: portalTheme.primary || themeColors.primary }]}
                        onPress={() => handleClose(currentAlert)}
                      >
                        <Text style={[styles.buttonText, { color: '#000' }]}>OK</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </>
              )}
            </View>
          </View>
        </Modal>
      )}
    </AlertContext.Provider>
  );
};

export default AlertProvider;

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  container: {
    width: '100%',
    maxWidth: 400,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 10,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    gap: 12,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFF',
    flex: 1,
  },
  content: {
    padding: 20,
  },
  message: {
    fontSize: 16,
    lineHeight: 24,
    textAlign: 'center',
  },
  actions: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: '#EEE',
    padding: 16,
    gap: 12,
  },
  button: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  cancelButton: {},
  confirmButton: {},
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  cancelButtonText: {},
  confirmButtonText: {},
});
