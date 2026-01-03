import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet } from 'react-native';
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
        return { backgroundColor: themeColors.primary, icon: 'help-circle' };
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

  return (
    <AlertContext.Provider value={{ showAlert, showConfirmation }}>
      {children}
      <Modal
        visible={!!currentAlert}
        transparent
        animationType="fade"
        statusBarTranslucent
        presentationStyle="overFullScreen"
        onRequestClose={() => currentAlert && handleClose(currentAlert)}
      >
        <View style={[styles.overlay, { backgroundColor: themeColors.modalOverlay, zIndex: 9999 }]}> 
          <View style={[styles.container, { backgroundColor: themeColors.card, zIndex: 10000 }]}> 
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
                  <Text style={[styles.message, { color: themeColors.text }]}>{currentAlert.message}</Text>
                </View>
                <View style={[styles.actions, { borderTopColor: themeColors.border }]}> 
                  {currentAlert.type === 'confirm' ? (
                    <>
                      <TouchableOpacity
                        style={[styles.button, styles.cancelButton, { backgroundColor: themeColors.inputBackground }]}
                        onPress={() => handleCancel(currentAlert)}
                      >
                        <Text style={[styles.buttonText, styles.cancelButtonText, { color: themeColors.info }]}>
                          {currentAlert.cancelText || 'Cancel'}
                        </Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.button, styles.confirmButton, { backgroundColor: themeColors.info }]}
                        onPress={() => handleConfirm(currentAlert)}
                      >
                        <Text style={[styles.buttonText, styles.confirmButtonText]}>
                          {currentAlert.confirmText || 'OK'}
                        </Text>
                      </TouchableOpacity>
                    </>
                  ) : (
                    <TouchableOpacity
                      style={[styles.button, { backgroundColor: getAlertStyles(currentAlert.type).backgroundColor }]}
                      onPress={() => handleClose(currentAlert)}
                    >
                      <Text style={[styles.buttonText, { color: '#FFF' }]}>OK</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>
    </AlertContext.Provider>
  );
};

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
