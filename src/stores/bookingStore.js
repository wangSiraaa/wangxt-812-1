import { reactive } from 'vue'
import dayjs from 'dayjs'
import { generateInitialData, MEMBER_LEVELS, TIME_SLOTS } from '../utils/data.js'

const STORAGE_KEY = 'air_dome_booking_data'

function loadFromStorage() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) return JSON.parse(stored)
  } catch (e) { console.error(e) }
  return null
}

function saveToStorage(data) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(data)) }
  catch (e) { console.error(e) }
}

const storedData = loadFromStorage()
const initialData = storedData || generateInitialData()

export const store = reactive({
  venues: initialData.venues,
  members: initialData.members,
  maintenanceSlots: initialData.maintenanceSlots,
  bookings: initialData.bookings,
  timeSlots: initialData.timeSlots,
  cancellationRules: initialData.cancellationRules,
  currentMember: null,
  selectedVenue: initialData.venues[0].id,
  selectedDate: dayjs().format('YYYY-MM-DD'),

  setCurrentMember(memberId) {
    this.currentMember = this.members.find(m => m.id === memberId) || null
  },

  setSelectedVenue(venueId) { this.selectedVenue = venueId },
  setSelectedDate(date) { this.selectedDate = date },

  isMaintenanceSlot(date, timeSlotId, venueId) {
    return this.maintenanceSlots.some(
      s => s.date === date && s.timeSlotId === timeSlotId && s.venueId === venueId
    )
  },

  getMaintenanceReason(date, timeSlotId, venueId) {
    const slot = this.maintenanceSlots.find(
      s => s.date === date && s.timeSlotId === timeSlotId && s.venueId === venueId
    )
    return slot ? slot.reason : null
  },

  isBookedSlot(date, timeSlotId, venueId) {
    return this.bookings.some(
      b => b.date === date && b.timeSlotId === timeSlotId && b.venueId === venueId && b.status !== 'cancelled'
    )
  },

  getBookingForSlot(date, timeSlotId, venueId) {
    return this.bookings.find(
      b => b.date === date && b.timeSlotId === timeSlotId && b.venueId === venueId && b.status !== 'cancelled'
    )
  },

  canBookGoldenSlot(memberLevel) {
    const level = MEMBER_LEVELS[memberLevel.toUpperCase()]
    return level ? level.canBookGolden : false
  },

  getMemberLevelInfo(levelId) {
    return MEMBER_LEVELS[levelId.toUpperCase()] || null
  },

  calculateCancellationFee(booking) {
    const bookingStart = dayjs(booking.date + ' ' + booking.timeSlotId.split('-')[0])
    const hoursUntilStart = bookingStart.diff(dayjs(), 'hour')
    const amount = booking.price || 100
    
    if (hoursUntilStart >= 24) {
      return {
        fee: 0,
        percent: 0,
        refund: amount,
        amount: amount,
        reason: '距离开场超过24小时，可免费取消',
        type: 'free'
      }
    } else if (hoursUntilStart > 0) {
      const fee = Math.round(amount * 0.3)
      const refund = amount - fee
      return {
        fee: fee,
        percent: 30,
        refund: refund,
        amount: amount,
        reason: '距离开场不足24小时，扣除30%违约金',
        type: 'late'
      }
    } else {
      const fee = Math.round(amount * 1.0)
      const refund = amount - fee
      return {
        fee: fee,
        percent: 100,
        refund: refund,
        amount: amount,
        reason: '已过开场时间，全额扣除违约金',
        type: 'noShow'
      }
    }
  },

  createBooking(bookingData) {
    const timeSlot = TIME_SLOTS.find(t => t.id === bookingData.timeSlotId)
    const memberId = bookingData.memberId || (this.currentMember ? this.currentMember.id : null)
    const member = this.members.find(m => m.id === memberId)
    
    if (!member) return { success: false, message: '会员信息不存在' }

    if (timeSlot && timeSlot.isGolden && !this.canBookGoldenSlot(member.level)) {
      const levelInfo = this.getMemberLevelInfo(member.level)
      return { success: false, message: `${levelInfo.name}不可预订黄金时段，请升级会员等级` }
    }

    if (this.isMaintenanceSlot(bookingData.date, bookingData.timeSlotId, bookingData.venueId)) {
      const reason = this.getMaintenanceReason(bookingData.date, bookingData.timeSlotId, bookingData.venueId)
      return { success: false, message: `该时段维护中：${reason}` }
    }

    if (this.isBookedSlot(bookingData.date, bookingData.timeSlotId, bookingData.venueId)) {
      return { success: false, message: '该时段已被预订' }
    }

    const newBooking = {
      id: 'b' + Date.now(),
      ...bookingData,
      memberId: memberId,
      memberName: member.name,
      price: timeSlot && timeSlot.isGolden ? 200 : 100,
      status: 'confirmed',
      createdAt: new Date().toISOString()
    }

    this.bookings.push(newBooking)
    saveToStorage({
      venues: this.venues,
      members: this.members,
      maintenanceSlots: this.maintenanceSlots,
      bookings: this.bookings,
      timeSlots: this.timeSlots,
      cancellationRules: this.cancellationRules
    })

    return { success: true, booking: newBooking, message: '预订成功' }
  },

  cancelBooking(bookingId) {
    const booking = this.bookings.find(b => b.id === bookingId)
    if (!booking) return { success: false, message: '预订不存在' }

    const feeInfo = this.calculateCancellationFee(booking)
    
    booking.status = 'cancelled'
    booking.cancelledAt = new Date().toISOString()
    booking.cancellationFee = feeInfo.fee

    saveToStorage({
      venues: this.venues,
      members: this.members,
      maintenanceSlots: this.maintenanceSlots,
      bookings: this.bookings,
      timeSlots: this.timeSlots,
      cancellationRules: this.cancellationRules
    })

    return { success: true, feeInfo, message: '取消成功' }
  },

  resetData() {
    localStorage.removeItem(STORAGE_KEY)
    const freshData = generateInitialData()
    this.venues = freshData.venues
    this.members = freshData.members
    this.maintenanceSlots = freshData.maintenanceSlots
    this.bookings = freshData.bookings
    this.timeSlots = freshData.timeSlots
    this.cancellationRules = freshData.cancellationRules
    this.currentMember = null
  },

  getMemberBookings(memberId) {
    return this.bookings
      .filter(b => b.memberId === memberId)
      .sort((a, b) => dayjs(b.date + ' ' + b.timeSlotId.split('-')[0]) - dayjs(a.date + ' ' + a.timeSlotId.split('-')[0]))
  }
})
