import { StyleSheet, View, Text, TextInput, ScrollView, Pressable, Alert, useColorScheme, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useState, useEffect, useMemo } from 'react';
import { useLeaveStore } from '../storage/store';
import { Colors, LeaveTypeColors, Spacing, BorderRadius } from '../constants/theme';
import { LeaveType, LeaveRecord } from '../types';
import { fs } from '../constants/layout';

interface AddLeaveScreenProps {
  isModal?: boolean;
  onClose?: () => void;
  modalEditId?: string;
  modalInitialDate?: string;
}

export default function AddLeaveScreen({ isModal = false, onClose, modalEditId, modalInitialDate }: AddLeaveScreenProps) {
  const systemScheme = useColorScheme();
  
  // Params from router (for legacy navigation, if any)
  const params = useLocalSearchParams<{ editId?: string; initialDate?: string }>();
  const routeEditId = params.editId;
  const initialDate = params.initialDate;

  // Resolve ID: favor modal prop first, fallback to route param
  const editId = modalEditId || routeEditId;
  const isEditMode = !!editId;

  // Zustand Store
  const leaves = useLeaveStore((state) => state.leaves);
  const addLeave = useLeaveStore((state) => state.addLeave);
  const updateLeave = useLeaveStore((state) => state.updateLeave);
  const deleteLeave = useLeaveStore((state) => state.deleteLeave);
  const themeSetting = useLeaveStore((state) => state.settings.theme);
  const showToast = useLeaveStore((state) => state.showToast);

  const activeTheme: 'light' | 'dark' = themeSetting === 'system' ? (systemScheme === 'dark' ? 'dark' : 'light') : (themeSetting === 'dark' ? 'dark' : 'light');
  const colors = Colors[activeTheme];

  // Form State
  const [reason, setReason] = useState('');
  const [type, setType] = useState<LeaveType>('Casual');
  const [date, setDate] = useState('');
  const [showDatePicker, setShowDatePicker] = useState(false);

  // Helper to format Date objects as YYYY-MM-DD
  const formatDateStr = (d: Date) => {
    return d.toISOString().split('T')[0];
  };

  // Pre-populate fields based on edit mode or initialDate
  useEffect(() => {
    if (isEditMode && editId) {
      const record = leaves.find((l) => l.id === editId);
      if (record) {
        setReason(record.reason);
        setType(record.type);
        setDate(record.date);
      }
    } else {
      // Default initialization
      const defaultDate = modalInitialDate || initialDate || formatDateStr(new Date());
      setReason('');
      setType('Casual');
      setDate(defaultDate);
    }
  }, [editId, initialDate, modalInitialDate, leaves, isEditMode]);

  // Calendar Math and Navigation for inline Date Picker
  const [pickerDate, setPickerDate] = useState(new Date());
  
  const pickerYear = pickerDate.getFullYear();
  const pickerMonth = pickerDate.getMonth();
  
  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const handlePrevMonth = () => {
    setPickerDate(new Date(pickerYear, pickerMonth - 1, 1));
  };

  const handleNextMonth = () => {
    setPickerDate(new Date(pickerYear, pickerMonth + 1, 1));
  };

  const getFormatDateStr = (y: number, m: number, d: number) => {
    const mm = String(m + 1).padStart(2, '0');
    const dd = String(d).padStart(2, '0');
    return `${y}-${mm}-${dd}`;
  };

  const daysInMonth = new Date(pickerYear, pickerMonth + 1, 0).getDate();
  const firstDayIndex = new Date(pickerYear, pickerMonth, 1).getDay();
  const weekdays = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

  const calendarDays = useMemo(() => {
    const days = [];
    for (let i = 0; i < firstDayIndex; i++) {
      days.push({ day: null, dateStr: '' });
    }
    for (let i = 1; i <= daysInMonth; i++) {
      const dateStr = getFormatDateStr(pickerYear, pickerMonth, i);
      days.push({ day: i, dateStr });
    }
    return days;
  }, [pickerYear, pickerMonth, daysInMonth, firstDayIndex]);

  // Form submission validation & action
  const handleSave = () => {
    if (!reason.trim()) {
      showToast('Reason required', 'Please enter a reason for the leave.', 'warning');
      return;
    }

    const d = new Date(date);
    if (isNaN(d.getTime())) {
      showToast('Invalid date', 'Please select a valid leave date.', 'warning');
      return;
    }

    // Check if there is already a leave recorded for this date
    const hasExistingLeaveForDate = leaves.some(
      (l) => l.date === date && (!isEditMode || l.id !== editId)
    );

    if (hasExistingLeaveForDate) {
      showToast('Date Unavailable', 'A leave is already recorded for this date.', 'warning');
      return;
    }

    const payload = {
      reason: reason.trim(),
      type,
      date,
    };

    if (isEditMode && editId) {
      const updatedRecord: LeaveRecord = {
        ...payload,
        id: editId,
        createdAt: leaves.find((l) => l.id === editId)?.createdAt || new Date().toISOString(),
      };
      updateLeave(updatedRecord);
      // Dismiss first, then toast appears above app content
      if (isModal && onClose) { onClose(); } else { router.replace('/'); }
      showToast('Leave updated', 'Your leave entry has been updated.', 'success');
    } else {
      addLeave(payload);
      if (isModal && onClose) { onClose(); } else { router.replace('/'); }
      showToast('Leave recorded', 'Your leave has been logged successfully.', 'success');
    }
  };

  // Deletion helper
  const handleDelete = () => {
    if (!editId) return;

    Alert.alert(
      'Confirm Deletion',
      'Are you sure you want to delete this leave entry? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete', 
          style: 'destructive', 
          onPress: () => {
            deleteLeave(editId);
            if (isModal && onClose) {
              onClose();
            } else {
              router.replace('/');
            }
          } 
        }
      ]
    );
  };

  const handleCancel = () => {
    if (isModal && onClose) {
      onClose();
    } else {
      router.replace('/');
    }
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]} edges={isModal ? ['top', 'bottom'] : ['bottom']}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
      >
      {/* Header bar only for modal context */}
      {isModal && (
        <View style={[styles.modalHeader, { borderColor: colors.border, backgroundColor: colors.card }]}>
          <Text style={[styles.modalTitle, { color: colors.text }]}>
            {isEditMode ? 'Edit Leave Log' : 'Record New Leave'}
          </Text>
          <Pressable style={styles.closeButton} onPress={handleCancel}>
            <Ionicons name="close" size={24} color={colors.text} />
          </Pressable>
        </View>
      )}

      <ScrollView
        contentContainerStyle={styles.scrollContainer}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="interactive"
      >
        
        {/* Date Input Box */}
        <View style={styles.inputGroup}>
          <Text style={[styles.label, { color: colors.textSecondary }]}>Leave Date</Text>
          <Pressable 
            style={[styles.textInput, styles.datePickerButton, { backgroundColor: colors.card, borderColor: colors.border }]}
            onPress={() => setShowDatePicker(!showDatePicker)}
          >
            <Text style={[styles.dateText, { color: date ? colors.text : colors.textMuted }]}>
              {date ? formatDate(date) : 'Select date'}
            </Text>
            <Ionicons name="calendar-outline" size={18} color={colors.textSecondary} />
          </Pressable>

          {/* Premium Inline Calendar Date Picker */}
          {showDatePicker && (
            <View style={[styles.inlinePicker, { backgroundColor: colors.card, borderColor: colors.border }]}>
              {/* Header Month Navigation */}
              <View style={styles.pickerHeader}>
                <Pressable onPress={handlePrevMonth} style={styles.pickerNavBtn}>
                  <Ionicons name="chevron-back" size={18} color={colors.primary} />
                </Pressable>
                
                <Text style={[styles.pickerMonthLabel, { color: colors.text }]}>
                  {monthNames[pickerMonth]} {pickerYear}
                </Text>

                <Pressable onPress={handleNextMonth} style={styles.pickerNavBtn}>
                  <Ionicons name="chevron-forward" size={18} color={colors.primary} />
                </Pressable>
              </View>

              {/* Weekday Row */}
              <View style={styles.pickerWeekdaysRow}>
                {weekdays.map((day, idx) => (
                  <Text key={idx} style={[styles.pickerWeekdayLabel, { color: colors.textMuted }]}>
                    {day}
                  </Text>
                ))}
              </View>

              {/* Days Grid */}
              <View style={styles.pickerDaysGrid}>
                {calendarDays.map((item, index) => {
                  if (item.day === null) {
                    return <View key={`empty-${index}`} style={styles.pickerDayBox} />;
                  }

                  const isSelected = item.dateStr === date;
                  const isToday = item.dateStr === formatDateStr(new Date());

                  return (
                    <Pressable
                      key={item.dateStr}
                      style={[
                        styles.pickerDayBox,
                        isSelected && [styles.pickerSelectedDay, { backgroundColor: colors.primary }],
                        !isSelected && isToday && [styles.pickerTodayDay, { borderColor: colors.primary }],
                      ]}
                      onPress={() => {
                        setDate(item.dateStr);
                        setShowDatePicker(false);
                      }}
                    >
                      <Text
                        style={[
                          styles.pickerDayText,
                          { color: isSelected ? '#ffffff' : colors.text },
                          isToday && !isSelected && { color: colors.primary, fontWeight: '700' }
                        ]}
                      >
                        {item.day}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          )}
        </View>

        {/* Leave Type Selection */}
        <View style={styles.inputGroup}>
          <Text style={[styles.label, { color: colors.textSecondary }]}>Leave Type</Text>
          <View style={styles.typeGrid}>
            {(['Casual', 'Vacation', 'Duty', 'Half Day'] as LeaveType[]).map((t) => {
              const isSelected = type === t;
              const typeColor = LeaveTypeColors[t];
              
              return (
                <Pressable
                  key={t}
                  style={[
                    styles.typeCard,
                    { 
                      backgroundColor: colors.card, 
                      borderColor: isSelected ? typeColor : colors.border,
                      borderWidth: isSelected ? 2 : 1 
                    }
                  ]}
                  onPress={() => setType(t)}
                >
                  <View style={[styles.typeDot, { backgroundColor: typeColor }]} />
                  <Text 
                    style={[styles.typeCardText, { color: colors.text, fontWeight: isSelected ? '700' : '500' }]}
                    numberOfLines={1}
                    adjustsFontSizeToFit
                    minimumFontScale={0.75}
                  >
                    {t} Leave
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* Reason / Title Field */}
        <View style={styles.inputGroup}>
          <Text style={[styles.label, { color: colors.textSecondary }]}>Reason for Leave</Text>
          <TextInput
            placeholder="e.g. Family function, Personal matter, Official travel"
            placeholderTextColor={colors.textMuted}
            value={reason}
            onChangeText={setReason}
            multiline
            numberOfLines={3}
            textAlignVertical="top"
            style={[styles.textInput, styles.textArea, { color: colors.text, backgroundColor: colors.card, borderColor: colors.border }]}
          />
        </View>

        {/* Action Buttons */}
        <View style={styles.btnRow}>
          <Pressable 
            style={[styles.primaryBtn, { backgroundColor: colors.primary }]}
            onPress={handleSave}
          >
            <Text style={styles.primaryBtnText}>
              {isEditMode ? 'Update Entry' : 'Record Leave'}
            </Text>
          </Pressable>

          {isEditMode && (
            <Pressable 
              style={[styles.deleteBtn, { borderColor: Colors.light.accent }]}
              onPress={handleDelete}
            >
              <Ionicons name="trash-outline" size={18} color={Colors.light.accent} />
              <Text style={[styles.deleteBtnText, { color: Colors.light.accent }]}>Delete Log</Text>
            </Pressable>
          )}

          <Pressable 
            style={[styles.cancelBtn, { borderColor: colors.border }]}
            onPress={handleCancel}
          >
            <Text style={[styles.cancelBtnText, { color: colors.textSecondary }]}>Cancel</Text>
          </Pressable>
        </View>

      </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
  },
  modalTitle: {
    fontSize: fs(16),
    fontWeight: '700',
  },
  closeButton: {
    padding: 4,
  },
  scrollContainer: {
    padding: Spacing.lg,
    paddingBottom: 120,
  },
  inputGroup: {
    marginBottom: Spacing.lg,
  },
  label: {
    fontSize: fs(12),
    fontWeight: '700',
    marginBottom: Spacing.sm,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  textInput: {
    borderWidth: 1,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    fontSize: fs(14),
  },
  datePickerButton: {
    height: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  dateText: {
    fontSize: fs(14),
  },
  inlinePicker: {
    marginTop: Spacing.xs,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
  },
  pickerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  pickerNavBtn: {
    padding: 4,
  },
  pickerMonthLabel: {
    fontSize: fs(14),
    fontWeight: '700',
  },
  pickerWeekdaysRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: Spacing.xs,
  },
  pickerWeekdayLabel: {
    width: `${100 / 7}%`,
    textAlign: 'center',
    fontSize: fs(10),
    fontWeight: '600',
  },
  pickerDaysGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  pickerDayBox: {
    width: `${100 / 7}%`,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: BorderRadius.sm,
    marginBottom: 2,
  },
  pickerDayText: {
    fontSize: fs(12),
    fontWeight: '500',
  },
  pickerSelectedDay: {
    borderRadius: BorderRadius.sm,
  },
  pickerTodayDay: {
    borderWidth: 1,
    borderRadius: BorderRadius.sm,
  },
  inputIconWrapper: {
    position: 'relative',
    justifyContent: 'center',
  },
  iconTextInput: {
    paddingRight: 40,
  },
  inputIcon: {
    position: 'absolute',
    right: Spacing.md,
  },
  textArea: {
    height: 90,
    paddingVertical: Spacing.md,
  },
  typeGrid: {
    flexDirection: 'column',
    gap: Spacing.sm,
  },
  typeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 48,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    borderWidth: 1,
    gap: Spacing.md,
  },
  typeDot: {
    width: 12,
    height: 12,
    borderRadius: BorderRadius.round,
  },
  typeCardText: {
    fontSize: fs(14),
  },
  btnRow: {
    marginTop: Spacing.xl,
    gap: Spacing.md,
  },
  primaryBtn: {
    height: 48,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryBtnText: {
    color: '#ffffff',
    fontSize: fs(14),
    fontWeight: '700',
  },
  deleteBtn: {
    flexDirection: 'row',
    height: 48,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
  },
  deleteBtnText: {
    fontSize: fs(14),
    fontWeight: '700',
  },
  cancelBtn: {
    height: 48,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelBtnText: {
    fontSize: fs(14),
    fontWeight: '600',
  },
});
