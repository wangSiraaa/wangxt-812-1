<template>
  <div class="venue-calendar">
    <div class="calendar-header">
      <div class="venue-selector">
        <label>场地：</label>
        <select v-model="localVenue" @change="onVenueChange">
          <option v-for="v in store.venues" :key="v.id" :value="v.id">{{ v.name }}</option>
        </select>
      </div>
      <div class="date-nav">
        <button class="btn btn-secondary" @click="prevDay">&lt;</button>
        <input type="date" v-model="localDate" @change="onDateChange" />
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
        @click="select(slot)"
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
</template>

<script setup>
import { ref, watch, computed } from 'vue'
import dayjs from 'dayjs'
import { store } from '../stores/bookingStore.js'
const emit = defineEmits(['select', 'venueChange', 'dateChange'])
const localVenue = ref(store.selectedVenue)
const localDate = ref(store.selectedDate)
watch(() => store.selectedVenue, v => localVenue.value = v)
watch(() => store.selectedDate, v => localDate.value = v)
function onVenueChange() { store.setSelectedVenue(localVenue.value); emit('venueChange', localVenue.value) }
function onDateChange() { store.setSelectedDate(localDate.value); emit('dateChange', localDate.value) }
function prevDay() { localDate.value = dayjs(localDate.value).subtract(1, 'day').format('YYYY-MM-DD'); onDateChange() }
function nextDay() { localDate.value = dayjs(localDate.value).add(1, 'day').format('YYYY-MM-DD'); onDateChange() }
function isMaint(slot) { return store.isMaintenanceSlot(localDate.value, slot.id, localVenue.value) }
function isBooked(slot) { return store.isBookedSlot(localDate.value, slot.id, localVenue.value) }
function isDisabled(slot) { return isMaint(slot) || isBooked(slot) }
function getMaintReason(slot) { return store.getMaintenanceReason(localDate.value, slot.id, localVenue.value) }
function getBooking(slot) { return store.getBookingForSlot(localDate.value, slot.id, localVenue.value) }
const canBookGolden = computed(() => { if (!store.currentMember) return false; return store.canBookGoldenSlot(store.currentMember.level) })
function showWarn(slot) { return slot.isGolden && !isMaint(slot) && !isBooked(slot) && store.currentMember && !canBookGolden.value }
function select(slot) { if (isDisabled(slot)) return; emit('select', { venueId: localVenue.value, date: localDate.value, timeSlotId: slot.id, timeSlot: slot }) }
</script>

<style scoped>
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
</style>
