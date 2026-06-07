<template>
  <div id="app">
    <header class="app-header">
      <h1>充气膜体育馆场地预订</h1>
      <div class="header-actions">
        <select v-model="currentMemberId" @change="setMember">
          <option :value="null">选择会员</option>
          <option v-for="m in store.members" :key="m.id" :value="m.id">
            {{ m.name }} ({{ m.levelName }})
          </option>
        </select>
        <button class="btn btn-secondary" @click="resetData">重置数据</button>
      </div>
    </header>

    <main class="app-main">
      <div class="section">
        <h2>场地预订</h2>
        <div class="calendar-header">
          <div class="venue-selector">
            <label>场地：</label>
            <select v-model="selectedVenue">
              <option v-for="v in store.venues" :key="v.id" :value="v.id">{{ v.name }}</option>
            </select>
          </div>
          <div class="date-nav">
            <button class="btn btn-secondary" @click="prevDay">&lt;</button>
            <input type="date" v-model="selectedDate" />
            <button class="btn btn-secondary" @click="nextDay">&gt;</button>
          </div>
        </div>
        <div class="legend">
          <span><span class="lc available"></span>可订</span>
          <span><span class="lc golden"></span>黄金场</span>
          <span><span class="lc maintenance"></span>维护</span>
          <span><span class="lc booked"></span>已订</span>
        </div>
        <div class="slots">
          <div
            v-for="slot in store.timeSlots"
            :key="slot.id"
            class="slot-card"
            :class="{ gold: slot.isGolden, maint: isMaint(slot), booked: isBooked(slot), disabled: isDisabled(slot) }"
            @click="selectSlot(slot)"
          >
            <div class="time">{{ slot.id }}</div>
            <div class="status">
              <span v-if="isMaint(slot)" class="badge badge-maintenance">{{ getMaintReason(slot) }}</span>
              <span v-else-if="isBooked(slot)" class="badge badge-booked">{{ getBooking(slot).memberName }}</span>
              <span v-else-if="slot.isGolden" class="badge badge-gold">黄金场 ¥200</span>
              <span v-else class="badge badge-normal">¥100</span>
            </div>
            <div v-if="showWarn(slot)" class="warn">会员等级不足</div>
          </div>
        </div>
      </div>

      <div class="section">
        <h2>我的预订</h2>
        <div v-if="!store.currentMember" class="empty-state">请先选择会员</div>
        <div v-else-if="myBookings.length === 0" class="empty-state">暂无预订</div>
        <div v-else class="booking-list">
          <div v-for="b in myBookings" :key="b.id" class="booking-card">
            <div class="booking-info">
              <div class="booking-title">{{ b.venueName }} - {{ b.date }} {{ b.timeSlotId }}</div>
              <div class="booking-meta">
                <span class="badge" :class="b.status === 'confirmed' ? 'badge-success' : 'badge-cancelled'">
                  {{ b.status === 'confirmed' ? '已确认' : '已取消' }}
                </span>
                <span>金额: ¥{{ b.amount }}</span>
              </div>
            </div>
            <div class="booking-actions">
              <button
                v-if="b.status === 'confirmed'"
                class="btn btn-danger btn-sm"
                @click="cancelBooking(b)"
              >
                取消预订
              </button>
            </div>
          </div>
        </div>
      </div>
    </main>

    <div v-if="showBookingModal" class="modal-overlay" @click="closeModal">
      <div class="modal" @click.stop>
        <h3>确认预订</h3>
        <div v-if="bookingError" class="alert alert-danger">{{ bookingError }}</div>
        <div v-else class="booking-summary">
          <p><strong>场地：</strong>{{ selectedSlot?.venueId }}</p>
          <p><strong>日期：</strong>{{ selectedSlot?.date }}</p>
          <p><strong>时段：</strong>{{ selectedSlot?.timeSlotId }}</p>
          <p><strong>价格：</strong>¥{{ selectedSlot?.timeSlot?.isGolden ? 200 : 100 }}</p>
        </div>
        <div class="modal-actions">
          <button class="btn btn-secondary" @click="closeModal">取消</button>
          <button class="btn btn-primary" @click="confirmBooking" :disabled="bookingError">确认预订</button>
        </div>
      </div>
    </div>

    <div v-if="showCancelModal" class="modal-overlay" @click="closeCancelModal">
      <div class="modal" @click.stop>
        <h3>取消预订</h3>
        <div v-if="cancelFeeInfo" class="cancel-info">
          <div v-if="cancelFeeInfo.fee === 0" class="alert alert-success">
            免费取消：将全额退款 ¥{{ cancelFeeInfo.amount }}
          </div>
          <div v-else class="alert alert-warning">
            <p>{{ cancelFeeInfo.reason }}</p>
            <p>扣费: ¥{{ cancelFeeInfo.fee }} ({{ cancelFeeInfo.percent }}%)</p>
            <p>退款: ¥{{ cancelFeeInfo.refund }}</p>
          </div>
        </div>
        <div class="modal-actions">
          <button class="btn btn-secondary" @click="closeCancelModal">返回</button>
          <button class="btn btn-danger" @click="confirmCancel">确认取消</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, reactive } from 'vue'
import dayjs from 'dayjs'
import { store } from './stores/bookingStore.js'

const currentMemberId = ref(null)
const selectedVenue = ref(store.selectedVenue)
const selectedDate = ref(store.selectedDate)
const showBookingModal = ref(false)
const showCancelModal = ref(false)
const selectedSlot = ref(null)
const selectedBooking = ref(null)
const bookingError = ref(null)
const cancelFeeInfo = ref(null)

function setMember() {
  store.setCurrentMember(currentMemberId.value)
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
    store.cancelBooking(selectedBooking.value.id)
    closeCancelModal()
  }
}

function resetData() {
  if (confirm('确定要重置所有数据吗？')) {
    store.resetData()
    currentMemberId.value = null
  }
}
</script>

<style>
.app-header {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  padding: 20px 30px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.app-header h1 { margin: 0; font-size: 22px; }
.header-actions { display: flex; gap: 12px; align-items: center; }
.header-actions select { padding: 8px 12px; border-radius: 6px; border: none; }
.app-main { padding: 24px; max-width: 1200px; margin: 0 auto; }
.section { margin-bottom: 32px; }
.section h2 { margin-top: 0; color: #1f2937; }
.calendar-header { display: flex; justify-content: space-between; margin-bottom: 16px; flex-wrap: wrap; gap: 10px; }
.venue-selector label { font-weight: 500; margin-right: 8px; }
.venue-selector select { padding: 6px 10px; border-radius: 6px; border: 1px solid #d1d5db; }
.date-nav { display: flex; align-items: center; gap: 8px; }
.date-nav input { padding: 6px 10px; border-radius: 6px; border: 1px solid #d1d5db; }
.legend { display: flex; gap: 16px; margin-bottom: 16px; font-size: 12px; color: #6b7280; }
.legend span { display: flex; align-items: center; gap: 4px; }
.lc { width: 14px; height: 14px; border-radius: 3px; }
.lc.available { background: #d1fae5; border: 1px solid #10b981; }
.lc.golden { background: #fef3c7; border: 1px solid #f59e0b; }
.lc.maintenance { background: #fee2e2; border: 1px solid #ef4444; }
.lc.booked { background: #e5e7eb; border: 1px solid #9ca3af; }
.slots { display: grid; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap: 8px; }
.slot-card { border: 2px solid #e5e7eb; border-radius: 8px; padding: 12px; cursor: pointer; transition: all 0.2s; background: white; }
.slot-card:hover:not(.disabled) { border-color: #667eea; transform: translateY(-1px); }
.slot-card.gold { background: linear-gradient(135deg, #fffbeb, #fef3c7); border-color: #f59e0b; }
.slot-card.maint { background: #fef2f2; border-color: #fca5a5; cursor: not-allowed; opacity: 0.7; }
.slot-card.booked { background: #f9fafb; border-color: #d1d5db; cursor: not-allowed; opacity: 0.6; }
.slot-card.disabled { cursor: not-allowed; }
.time { font-size: 14px; font-weight: 600; margin-bottom: 4px; }
.status { margin-bottom: 4px; }
.warn { font-size: 10px; color: #ef4444; font-weight: 500; }
.empty-state { text-align: center; padding: 40px; color: #9ca3af; }
.booking-list { display: flex; flex-direction: column; gap: 12px; }
.booking-card { background: white; border: 1px solid #e5e7eb; border-radius: 8px; padding: 16px; display: flex; justify-content: space-between; align-items: center; }
.booking-title { font-weight: 600; margin-bottom: 6px; }
.booking-meta { display: flex; gap: 12px; font-size: 13px; color: #6b7280; }
.modal-overlay { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 1000; }
.modal { background: white; border-radius: 12px; padding: 24px; min-width: 400px; max-width: 90%; }
.modal h3 { margin-top: 0; }
.modal-actions { display: flex; justify-content: flex-end; gap: 12px; margin-top: 20px; }
.booking-summary p { margin: 8px 0; }
.cancel-info { margin: 16px 0; }
</style>
