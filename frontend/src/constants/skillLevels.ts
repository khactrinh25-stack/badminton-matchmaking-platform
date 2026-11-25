export interface SkillLevelOption {
  value: number;
  label: string;
  description: string;
}

export const SKILL_LEVEL_OPTIONS: SkillLevelOption[] = [
  { value: 1.0, label: 'Newbie', description: 'Mới làm quen cầm vợt, giao cầu và luật chơi cơ bản' },
  { value: 1.5, label: 'Yếu', description: 'Đánh qua lại cơ bản, phông cầu và di chuyển chưa ổn định' },
  { value: 2.0, label: 'Trung bình yếu', description: 'Biết luật đôi, di chuyển bước đơn và bắt đầu biết đập cầu' },
  { value: 2.5, label: 'Trung bình', description: 'Đánh đôi ổn định, thủ cầu và điều cầu cơ bản tốt' },
  { value: 3.0, label: 'Trung bình khá', description: 'Phối hợp công thủ nhịp nhàng, điều cầu chiến thuật tốt' },
  { value: 3.5, label: 'Khá', description: 'Lực cổ tay tốt, tốc độ cao, xử lý kỹ thuật đa dạng' },
  { value: 4.0, label: 'Bán chuyên', description: 'Kỹ thuật toàn diện, trình độ giải đấu phong trào' },
];

export function getSkillLevelLabel(level: number): string {
  const found = SKILL_LEVEL_OPTIONS.find((opt) => opt.value === level);
  return found ? found.label : `${level.toFixed(1)} điểm`;
}
