import { CancelPolicy, PrismaClient, Role, SessionStatus } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  const passwordHash = await bcrypt.hash('123456', 10);

  // 1. Tạo 1 Admin
  const admin = await prisma.user.upsert({
    where: { phone_number: '0900000001' },
    update: {},
    create: {
      phone_number: '0900000001',
      password_hash: passwordHash,
      full_name: 'Quản trị viên Hệ thống',
      role: Role.ADMIN,
      skill_level: 4.0,
      available_balance: 0,
    },
  });

  // 2. Tạo 2 Host
  const host1 = await prisma.user.upsert({
    where: { phone_number: '0901000001' },
    update: {},
    create: {
      phone_number: '0901000001',
      password_hash: passwordHash,
      full_name: 'Nguyễn Văn Hùng (Host Q1)',
      role: Role.USER,
      skill_level: 3.5,
      available_balance: 500000,
      bank_name: 'Vietcombank',
      bank_account_number: '0071001234567',
      bank_account_name: 'NGUYEN VAN HUNG',
    },
  });

  const host2 = await prisma.user.upsert({
    where: { phone_number: '0901000002' },
    update: {},
    create: {
      phone_number: '0901000002',
      password_hash: passwordHash,
      full_name: 'Trần Minh Tuấn (Host Q11)',
      role: Role.USER,
      skill_level: 4.0,
      available_balance: 300000,
      bank_name: 'Techcombank',
      bank_account_number: '1903456789012',
      bank_account_name: 'TRAN MINH TUAN',
    },
  });

  // 3. Tạo 3 Guest
  const guest1 = await prisma.user.upsert({
    where: { phone_number: '0902000001' },
    update: {},
    create: {
      phone_number: '0902000001',
      password_hash: passwordHash,
      full_name: 'Lê Thị Mai (Guest)',
      role: Role.USER,
      skill_level: 2.5,
      available_balance: 400000,
    },
  });

  const guest2 = await prisma.user.upsert({
    where: { phone_number: '0902000002' },
    update: {},
    create: {
      phone_number: '0902000002',
      password_hash: passwordHash,
      full_name: 'Phạm Hoàng Nam (Guest)',
      role: Role.USER,
      skill_level: 3.5,
      available_balance: 600000,
    },
  });

  const guest3 = await prisma.user.upsert({
    where: { phone_number: '0902000003' },
    update: {},
    create: {
      phone_number: '0902000003',
      password_hash: passwordHash,
      full_name: 'Võ Quốc Bảo (Guest)',
      role: Role.USER,
      skill_level: 4.5,
      available_balance: 250000,
    },
  });

  // 4. Tạo 3 buổi đánh cầu lông mẫu tại TP.HCM
  const existingSessionsCount = await prisma.session.count();
  if (existingSessionsCount === 0) {
    const now = new Date();
    const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    const dayAfter = new Date(now.getTime() + 48 * 60 * 60 * 1000);

    const s1Start = new Date(tomorrow);
    s1Start.setHours(18, 0, 0, 0);
    const s1End = new Date(tomorrow);
    s1End.setHours(20, 0, 0, 0);

    const s2Start = new Date(tomorrow);
    s2Start.setHours(19, 30, 0, 0);
    const s2End = new Date(tomorrow);
    s2End.setHours(21, 30, 0, 0);

    const s3Start = new Date(dayAfter);
    s3Start.setHours(9, 0, 0, 0);
    const s3End = new Date(dayAfter);
    s3End.setHours(11, 0, 0, 0);

    await prisma.session.createMany({
      data: [
        {
          host_id: host1.id,
          title: 'Giao lưu cầu lông tối Thứ 5 - Trình độ Trung bình',
          court_name: 'CLB Cầu lông Tao Đàn',
          address: 'Số 1 Huyền Trân Công Chúa, Phường Bến Thành, Quận 1, TP.HCM',
          court_number: 'Sân 3 & Sân 4',
          latitude: 10.7745,
          longitude: 106.6923,
          start_time: s1Start,
          end_time: s1End,
          price_per_slot: 75000,
          min_skill_level: 2.5,
          max_skill_level: 3.5,
          min_players: 4,
          max_players: 8,
          booked_slots: 0,
          cancel_policy: CancelPolicy.FLEXIBLE_6H,
          status: SessionStatus.OPEN,
          note: 'Bao cầu Thành Công, nước suối tự túc. Vui vẻ hòa đồng.',
        },
        {
          host_id: host2.id,
          title: 'Kèo đánh đôi nâng cao - Nhà thi đấu Phú Thọ',
          court_name: 'Nhà tập luyện Thể thao Phú Thọ',
          address: '219 Lý Thường Kiệt, Phường 15, Quận 11, TP.HCM',
          court_number: 'Sân số 7',
          latitude: 10.7712,
          longitude: 106.6579,
          start_time: s2Start,
          end_time: s2End,
          price_per_slot: 90000,
          min_skill_level: 3.5,
          max_skill_level: 5.0,
          min_players: 4,
          max_players: 6,
          booked_slots: 0,
          cancel_policy: CancelPolicy.MODERATE_12H,
          status: SessionStatus.OPEN,
          note: 'Đánh cầu Yonex AS-50, ưu tiên các bạn đánh đôi cứng tay.',
        },
        {
          host_id: host1.id,
          title: 'Cầu lông cuối tuần sáng nhẹ nhàng - Sân Kỳ Hòa',
          court_name: 'Sân Cầu lông Kỳ Hòa',
          address: '238 Đường 3 Tháng 2, Phường 12, Quận 10, TP.HCM',
          court_number: 'Sân 2',
          latitude: 10.7731,
          longitude: 106.6698,
          start_time: s3Start,
          end_time: s3End,
          price_per_slot: 65000,
          min_skill_level: 1.5,
          max_skill_level: 3.0,
          min_players: 4,
          max_players: 8,
          booked_slots: 0,
          cancel_policy: CancelPolicy.STRICT_24H,
          status: SessionStatus.OPEN,
          note: 'Phù hợp người mới và trung bình yếu, có hỗ trợ chia cặp.',
        },
      ],
    });
  }

  console.log('Seed completed successfully:', {
    admin: admin.phone_number,
    hosts: [host1.phone_number, host2.phone_number],
    guests: [guest1.phone_number, guest2.phone_number, guest3.phone_number],
  });
}

main()
  .catch((e) => {
    console.error('Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
