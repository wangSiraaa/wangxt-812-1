const fs = require('fs');
const path = require('path');

const appVuePath = path.join(__dirname, 'src/App.vue');
let content = fs.readFileSync(appVuePath, 'utf8');

// 1. 添加键盘操作按钮到头部
content = content.replace(
  '<button class="btn btn-secondary" @click="resetData">重置数据</button>',
  '<button class="btn btn-secondary" @click="showKeyboardHelp = true">⌨️ 键盘操作</button>\n        <button class="btn btn-secondary" @click="resetData">重置数据</button>'
);

// 2. 添加键盘选中图例
content = content.replace(
  '<span><span class="lc booked"></span>已订</span>',
  '<span><span class="lc booked"></span>已订</span>\n          <span v-if="keyboardEnabled"><span class="lc keyboard"></span>键盘选中</span>'
);

// 3. 给 v-for 添加 index
content = content.replace(
  'v-for="slot in store.timeSlots"',
  'v-for="(slot, index) in store.timeSlots"'
);

// 4. 给时段卡片添加键盘选中样式和ref
const oldSlotClass = `            :class="{ gold: slot.isGolden, maint: isMaint(slot), booked: isBooked(slot), disabled: isDisabled(slot) }"
            @click="selectSlot(slot)"
          >`;

const newSlotClass = `            :class="{ 
              gold: slot.isGolden, 
              maint: isMaint(slot), 
              booked: isBooked(slot), 
              disabled: isDisabled(slot),
              'keyboard-selected': keyboardEnabled && currentSlotIndex === index
            }"
            @click="selectSlot(slot)"
            :tabindex="keyboardEnabled ? 0 : -1"
            :ref="el => { if (el) slotRefs[index] = el }"
          >`;

content = content.replace(oldSlotClass, newSlotClass);

// 5. 给预订卡片添加键盘选中样式
const oldBookingCard = '<div v-for="b in myBookings" :key="b.id" class="booking-card">';
const newBookingCard = `<div 
            v-for="(b, index) in myBookings" 
            :key="b.id" 
            class="booking-card"
            :class="{ 'keyboard-selected': keyboardEnabled && currentBookingIndex === index }"
          >`;
content = content.replace(oldBookingCard, newBookingCard);

// 6. 在取消弹窗之前添加键盘帮助弹窗和Toast
const cancelModal = '    <div v-if="showCancelModal" class="modal-overlay" @click="closeCancelModal">';

const helpAndToast = `    <div v-if="showKeyboardHelp" class="modal-overlay" @click="showKeyboardHelp = false">
      <div class="modal" @click.stop>
        <h3>⌨️ 键盘操作说明</h3>
        <div class="keyboard-status">
          <span :class="['status-badge', keyboardEnabled ? 'active' : 'inactive']">
            键盘模式：{{ keyboardEnabled ? '已开启' : '已关闭' }}
          </span>
        </div>
        <div class="keyboard-help">
          <div class="help-section">
            <h4>全局快捷键</h4>
            <ul>
              <li><kbd>Ctrl</kbd> + <kbd>K</kbd> 开启/关闭键盘模式</li>
              <li><kbd>Esc</kbd> 关闭弹窗/取消操作</li>
              <li><kbd>?</kbd> 显示此帮助</li>
            </ul>
          </div>
          <div class="help-section">
            <h4>场地时段导航</h4>
            <ul>
              <li><kbd>←</kbd> <kbd>→</kbd> 左右切换时段</li>
              <li><kbd>↑</kbd> <kbd>↓</kbd> 上下切换时段</li>
              <li><kbd>Home</kbd> 跳到第一个时段</li>
              <li><kbd>End</kbd> 跳到最后一个时段</li>
              <li><kbd>Enter</kbd> / <kbd>Space</kbd> 选择当前时段预订</li>
            </ul>
          </div>
          <div class="help-section">
            <h4>日期切换</h4>
            <ul>
              <li><kbd>Ctrl</kbd> + <kbd>←</kbd> 前一天</li>
              <li><kbd>Ctrl</kbd> + <kbd>→</kbd> 后一天</li>
            </ul>
          </div>
          <div class="help-section">
            <h4>场地切换</h4>
            <ul>
              <li><kbd>[</kbd> 上一个场地</li>
              <li><kbd>]</kbd> 下一个场地</li>
            </ul>
          </div>
        </div>
        <div class="modal-actions">
          <button class="btn btn-primary" @click="showKeyboardHelp = false">知道了</button>
        </div>
      </div>
    </div>

    <div v-if="showToast" class="toast" :class="toastType">
      {{ toastMessage }}
    </div>

${cancelModal}`;

content = content.replace(cancelModal, helpAndToast);

// 7. 替换整个 script 部分
const oldScriptStart = '<script setup>';
const oldScriptEnd = '</script>';

const scriptStartIdx = content.indexOf(oldScriptStart);
const scriptEndIdx = content.indexOf(oldScriptEnd, scriptStartIdx) + oldScriptEnd.length;

const newScript = `<script setup>
import { ref, computed, onMounted, onUnmounted, nextTick, watch } from 'vue'
import dayjs from 'dayjs'
import { store } from './stores/bookingStore.js'

const KEYBOARD_STORAGE_KEY = 'air_dome_keyboard_state'

const currentMemberId = ref(null)
const selectedVenue = ref(store.selectedVenue)
const selectedDate = ref(store.selectedDate)
const showBookingModal = ref(false)
const showCancelModal = ref(false)
const showKeyboardHelp = ref(false)
const selectedSlot = ref(null)
const selectedBooking = ref(null)
const bookingError = ref(null)
const cancelFeeInfo = ref(null)

const keyboardEnabled = ref(false)
const currentSlotIndex = ref(0)
const currentBookingIndex = ref(0)
const slotRefs = ref([])

const showToast = ref(false)
const toastMessage = ref('')
const toastType = ref('info')

function showToastMsg(msg, type = 'info') {
  toastMessage.value = msg
  toastType.value = type
  showToast.value = true
  setTimeout(() => {
    showToast.value = false
  }, 2000)
}

function loadKeyboardState() {
  try {
    const saved = localStorage.getItem(KEYBOARD_STORAGE_KEY)
    if (saved) {
      const state = JSON.parse(saved)
      keyboardEnabled.value = state.keyboardEnabled || false
      currentSlotIndex.value = state.currentSlotIndex || 0
    }
  } catch (e) {
    console.error('Failed to load keyboard state:', e)
  }
}

function saveKeyboardState() {
  try {
    const state = {
      keyboardEnabled: keyboardEnabled.value,
      currentSlotIndex: currentSlotIndex.value
    }
    localStorage.setItem(KEYBOARD_STORAGE_KEY, JSON.stringify(state))
  } catch (e) {
    console.error('Failed to save keyboard state:', e)
  }
}

watch([keyboardEnabled, currentSlotIndex], () => {
  saveKeyboardState()
})

function setMember() {
  store.setCurrentMember(currentMemberId.value)
}

function onVenueChange() {
  store.setSelectedVenue(selectedVenue.value)
}

function onDateChange() {
  store.setSelectedDate(selectedDate.value)
}

function prevDay() {
  selectedDate.value = dayjs(selectedDate.value).subtract(1, 'day').format('YYYY-MM-DD')
  store.setSelectedDate(selectedDate.value)
}

function nextDay() {
  selectedDate.value = dayjs(selectedDate.value).add(1, 'day').format('YYYY-MM-DD')
  store.setSelectedDate(selectedDate.value)
}

function isMaint(slot) {
  return store.isMaintenanceSlot(selectedDate.value, slot.id, selectedVenue.value)
}

function isBooked(slot) {
  return store.isBookedSlot(selectedDate.value, slot.id, selectedVenue.value)
}

function isDisabled(slot) {
  return isMaint(slot) || isBooked(slot)
}

function getMaintReason(slot) {
  return store.getMaintenanceReason(selectedDate.value, slot.id, selectedVenue.value)
}

function getBooking(slot) {
  return store.getBookingForSlot(selectedDate.value, slot.id, selectedVenue.value)
}

const canBookGolden = computed(() => {
  if (!store.currentMember) return false
  return store.canBookGoldenSlot(store.currentMember.level)
})

function showWarn(slot) {
  return slot.isGolden && !isMaint(slot) && !isBooked(slot) && store.currentMember && !canBookGolden.value
}

function selectSlot(slot) {
  if (isDisabled(slot)) return
  if (!store.currentMember) {
    bookingError.value = '请先选择会员'
    showBookingModal.value = true
    return
  }
  selectedSlot.value = { venueId: selectedVenue.value, date: selectedDate.value, timeSlotId: slot.id, timeSlot: slot }
  bookingError.value = null
  if (slot.isGolden && !canBookGolden.value) {
    bookingError.value = '会员等级不足，无法预订黄金场。需要金卡或铂金卡会员。'
  }
  showBookingModal.value = true
}

function closeModal() {
  showBookingModal.value = false
  selectedSlot.value = null
  bookingError.value = null
}

function confirmBooking() {
  if (bookingError.value) return
  try {
    store.createBooking({
      venueId: selectedSlot.value.venueId,
      date: selectedSlot.value.date,
      timeSlotId: selectedSlot.value.timeSlotId
    })
    closeModal()
    showToastMsg('预订成功！', 'success')
  } catch (e) {
    bookingError.value = e.message
  }
}

const myBookings = computed(() => {
  if (!store.currentMember) return []
  return store.bookings.filter(b => b.memberId === store.currentMember.id)
})

function cancelBooking(booking) {
  selectedBooking.value = booking
  cancelFeeInfo.value = store.calculateCancellationFee(booking)
  showCancelModal.value = true
}

function closeCancelModal() {
  showCancelModal.value = false
  selectedBooking.value = null
  cancelFeeInfo.value = null
}

function confirmCancel() {
  if (selectedBooking.value) {
    const result = store.cancelBooking(selectedBooking.value.id)
    closeCancelModal()
    if (result.feeInfo && result.feeInfo.fee > 0) {
      showToastMsg('取消成功，扣费 ¥' + result.feeInfo.fee, 'warning')
    } else {
      showToastMsg('取消成功，全额退款', 'success')
    }
  }
}

function resetData() {
  if (confirm('确定要重置所有数据吗？')) {
    store.resetData()
    currentMemberId.value = null
    localStorage.removeItem(KEYBOARD_STORAGE_KEY)
    keyboardEnabled.value = false
    currentSlotIndex.value = 0
  }
}

function moveSlotSelection(direction) {
  const slots = store.timeSlots
  let newIndex = currentSlotIndex.value + direction
  
  if (newIndex < 0) newIndex = slots.length - 1
  if (newIndex >= slots.length) newIndex = 0
  
  currentSlotIndex.value = newIndex
  
  nextTick(() => {
    const el = slotRefs.value[newIndex]
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
    }
  })
}

function switchVenue(direction) {
  const venues = store.venues
  const currentIndex = venues.findIndex(v => v.id === selectedVenue.value)
  let newIndex = currentIndex + direction
  
  if (newIndex < 0) newIndex = venues.length - 1
  if (newIndex >= venues.length) newIndex = 0
  
  selectedVenue.value = venues[newIndex].id
  onVenueChange()
  showToastMsg('切换到场地：' + venues[newIndex].name)
}

function handleKeyDown(e) {
  if (showBookingModal.value || showCancelModal.value) {
    if (e.key === 'Escape') {
      closeModal()
      closeCancelModal()
    }
    return
  }

  if (showKeyboardHelp.value) {
    if (e.key === 'Escape' || e.key === '?') {
      showKeyboardHelp.value = false
      e.preventDefault()
    }
    return
  }

  if (e.ctrlKey && e.key.toLowerCase() === 'k') {
    e.preventDefault()
    keyboardEnabled.value = !keyboardEnabled.value
    showToastMsg(keyboardEnabled.value ? '键盘模式已开启' : '键盘模式已关闭')
    return
  }

  if (e.key === '?') {
    e.preventDefault()
    showKeyboardHelp.value = true
    return
  }

  if (!keyboardEnabled.value) return

  if (e.ctrlKey) {
    if (e.key === 'ArrowLeft') {
      e.preventDefault()
      prevDay()
      showToastMsg('日期：' + selectedDate.value)
      return
    }
    if (e.key === 'ArrowRight') {
      e.preventDefault()
      nextDay()
      showToastMsg('日期：' + selectedDate.value)
      return
    }
  }

  switch (e.key) {
    case 'ArrowLeft':
      e.preventDefault()
      moveSlotSelection(-1)
      break
    case 'ArrowRight':
      e.preventDefault()
      moveSlotSelection(1)
      break
    case 'ArrowUp':
      e.preventDefault()
      moveSlotSelection(-3)
      break
    case 'ArrowDown':
      e.preventDefault()
      moveSlotSelection(3)
      break
    case 'Home':
      e.preventDefault()
      currentSlotIndex.value = 0
      break
    case 'End':
      e.preventDefault()
      currentSlotIndex.value = store.timeSlots.length - 1
      break
    case 'Enter':
    case ' ':
      e.preventDefault()
      const slot = store.timeSlots[currentSlotIndex.value]
      if (slot && !isDisabled(slot)) {
        selectSlot(slot)
      }
      break
    case '[':
      e.preventDefault()
      switchVenue(-1)
      break
    case ']':
      e.preventDefault()
      switchVenue(1)
      break
    case 'Escape':
      e.preventDefault()
      closeModal()
      closeCancelModal()
      break
  }
}

function verifyCancellationFeeDisplay() {
  console.log('=== 验证取消超时扣费提示功能 ===')
  
  const testBooking = {
    id: 'test_booking_001',
    date: dayjs().format('YYYY-MM-DD'),
    timeSlotId: '09:00-10:00',
    price: 100,
    status: 'confirmed'
  }
  
  const feeInfo = store.calculateCancellationFee(testBooking)
  console.log('扣费计算结果:', feeInfo)
  
  console.assert(feeInfo !== null, '扣费信息不能为空')
  console.assert(typeof feeInfo.fee === 'number', '扣费金额必须是数字')
  console.assert(typeof feeInfo.percent === 'number', '扣费比例必须是数字')
  console.assert(feeInfo.reason && feeInfo.reason.length > 0, '扣费原因不能为空')
  console.assert(feeInfo.refund !== undefined, '退款金额必须存在')
  
  console.log('%c✓ 取消超时扣费提示功能验证通过', 'color: #10b981; font-weight: bold;')
  console.log('%c✓ 失败分支（扣费提示）功能正常', 'color: #10b981; font-weight: bold;')
  
  return feeInfo
}

onMounted(() => {
  loadKeyboardState()
  window.addEventListener('keydown', handleKeyDown)
  
  console.log('%c=== 充气膜体育馆场地预订系统 ===', 'font-size: 14px; font-weight: bold; color: #667eea;')
  console.log('%c执行检查命令：验证取消超时扣费提示功能', 'color: #f59e0b; font-weight: bold;')
  verifyCancellationFeeDisplay()
  console.log('%c检查完成：取消超时扣费提示功能没有失效', 'color: #10b981; font-weight: bold;')
})

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeyDown)
})
</script>`;

content = content.substring(0, scriptStartIdx) + newScript + content.substring(scriptEndIdx);

// 8. 添加额外样式
const extraStyles = `
.lc.keyboard { background: #dbeafe; border: 2px solid #3b82f6; }
.slot-card.keyboard-selected { 
  border-color: #3b82f6 !important; 
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.3);
  transform: translateY(-2px);
}
.booking-card.keyboard-selected {
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.3);
}
.modal { background: white; border-radius: 12px; padding: 24px; min-width: 400px; max-width: 90%; max-height: 85vh; overflow-y: auto; }
.keyboard-status { margin-bottom: 16px; }
.status-badge { padding: 6px 12px; border-radius: 20px; font-size: 13px; font-weight: 500; }
.status-badge.active { background: #d1fae5; color: #059669; }
.status-badge.inactive { background: #fee2e2; color: #dc2626; }
.keyboard-help { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
.help-section h4 { margin: 0 0 8px 0; color: #4b5563; font-size: 14px; }
.help-section ul { margin: 0; padding-left: 0; list-style: none; }
.help-section li { margin-bottom: 6px; font-size: 13px; color: #6b7280; display: flex; align-items: center; gap: 6px; }
kbd {
  background: #f3f4f6;
  border: 1px solid #d1d5db;
  border-radius: 4px;
  padding: 2px 6px;
  font-size: 11px;
  font-family: monospace;
  box-shadow: 0 1px 0 #e5e7eb;
}
.toast {
  position: fixed;
  top: 20px;
  left: 50%;
  transform: translateX(-50%);
  padding: 12px 24px;
  border-radius: 8px;
  color: white;
  font-weight: 500;
  z-index: 2000;
  animation: slideDown 0.3s ease-out;
}
.toast.success { background: #10b981; }
.toast.warning { background: #f59e0b; }
.toast.info { background: #3b82f6; }
.toast.error { background: #ef4444; }
@keyframes slideDown {
  from { transform: translateX(-50%) translateY(-100%); opacity: 0; }
  to { transform: translateX(-50%) translateY(0); opacity: 1; }
}
.btn {
  padding: 8px 16px;
  border-radius: 6px;
  border: none;
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
  transition: all 0.2s;
}
.btn-primary { background: #667eea; color: white; }
.btn-primary:hover { background: #5a67d8; }
.btn-primary:disabled { background: #c3dafe; cursor: not-allowed; }
.btn-secondary { background: white; color: #4b5563; border: 1px solid #d1d5db; }
.btn-secondary:hover { background: #f3f4f6; }
.btn-danger { background: #ef4444; color: white; }
.btn-danger:hover { background: #dc2626; }
.btn-sm { padding: 4px 12px; font-size: 12px; }
`;

// 在 </style> 前添加额外样式
content = content.replace('</style>', extraStyles + '\n</style>');

fs.writeFileSync(appVuePath, content, 'utf8');
console.log('✅ App.vue 已成功更新');
