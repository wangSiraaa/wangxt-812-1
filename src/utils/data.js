import dayjs from 'dayjs'

export const MEMBER_LEVELS = {
  NORMAL: { id: 'normal', name: '普通会员', minLevel: 0, canBookGolden: false },
  SILVER: { id: 'silver', name: '银卡会员', minLevel: 1, canBookGolden: false },
  GOLD: { id: 'gold', name: '金卡会员', minLevel: 2, canBookGolden: true },
  PLATINUM: { id: 'platinum', name: '铂金会员', minLevel: 3, canBookGolden: true }
}

export const TIME_SLOTS = [
  { id: '08:00-09:00', start: '08:00', end: '09:00', isGolden: false },
  { id: '09:00-10:00', start: '09:00', end: '10:00', isGolden: false },
  { id: '10:00-11:00', start: '10:00', end: '11:00', isGolden: false },
  { id: '11:00-12:00', start: '11:00', end: '12:00', isGolden: false },
  { id: '12:00-13:00', start: '12:00', end: '13:00', isGolden: false },
  { id: '13:00-14:00', start: '13:00', end: '14:00', isGolden: false },
  { id: '14:00-15:00', start: '14:00', end: '15:00', isGolden: false },
  { id: '15:00-16:00', start: '15:00', end: '16:00', isGolden: false },
  { id: '16:00-17:00', start: '16:00', end: '17:00', isGolden: false },
  { id: '17:00-18:00', start: '17:00', end: '18:00', isGolden: false },
  { id: '18:00-19:00', start: '18:00', end: '19:00', isGolden: true },
  { id: '19:00-20:00', start: '19:00', end: '20:00', isGolden: true },
  { id: '20:00-21:00', start: '20:00', end: '21:00', isGolden: true },
  { id: '21:00-22:00', start: '21:00', end: '22:00', isGolden: true }
]

export const VENUES = [
  { id: 'v1', name: '主场地A', type: '篮球场', capacity: 20 },
  { id: 'v2', name: '主场地B', type: '羽毛球场', capacity: 16 },
  { id: 'v3', name: '多功能厅', type: '综合', capacity: 30 }
]

export const CANCELLATION_RULES = {
  freeCancelHours: 24,
  lateCancelRate: 0.3,
  noShowRate: 1.0
}

export function generateInitialData() {
  const today = dayjs()
  const maintenanceDays = [
    today.add(2, 'day').format('YYYY-MM-DD'),
    today.add(5, 'day').format('YYYY-MM-DD')
  ]

  const maintenanceSlots = []
  maintenanceDays.forEach(date => {
    maintenanceSlots.push({ date, timeSlotId: '10:00-11:00', venueId: 'v1', reason: '设备例行维护' })
    maintenanceSlots.push({ date, timeSlotId: '11:00-12:00', venueId: 'v1', reason: '设备例行维护' })
    maintenanceSlots.push({ date, timeSlotId: '14:00-15:00', venueId: 'v2', reason: '场地清洁保养' })
  })

  const members = [
    { id: 'm1', name: '张三', phone: '13800138001', level: 'normal', balance: 500 },
    { id: 'm2', name: '李四', phone: '13800138002', level: 'silver', balance: 1000 },
    { id: 'm3', name: '王五', phone: '13800138003', level: 'gold', balance: 2000 },
    { id: 'm4', name: '赵六', phone: '13800138004', level: 'platinum', balance: 5000 }
  ]

  const bookings = [
    {
      id: 'b1',
      venueId: 'v1',
      date: today.add(1, 'day').format('YYYY-MM-DD'),
      timeSlotId: '18:00-19:00',
      memberId: 'm3',
      memberName: '王五',
      price: 200,
      status: 'confirmed',
      createdAt: today.subtract(2, 'hour').toISOString()
    },
    {
      id: 'b2',
      venueId: 'v2',
      date: today.add(1, 'day').format('YYYY-MM-DD'),
      timeSlotId: '19:00-20:00',
      memberId: 'm4',
      memberName: '赵六',
      price: 180,
      status: 'confirmed',
      createdAt: today.subtract(1, 'day').toISOString()
    }
  ]

  return {
    venues: VENUES,
    members,
    maintenanceSlots,
    bookings,
    timeSlots: TIME_SLOTS,
    memberLevels: MEMBER_LEVELS,
    cancellationRules: CANCELLATION_RULES,
    initializedAt: new Date().toISOString()
  }
}
