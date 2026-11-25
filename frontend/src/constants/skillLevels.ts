export interface SkillLevelOption {
  value: number;
  label: string;
  description: string;
}

export const SKILL_LEVEL_OPTIONS: SkillLevelOption[] = [
  { value: 1.0, label: 'Mới tập chơi', description: 'Làm quen cầm vợt, giao cầu cơ bản' },
  { value: 1.5, label: 'Nhập môn', description: 'Đánh qua lại cơ bản, chưa ổn định' },
  { value: 2.0, label: 'Yếu', description: 'Biết luật đôi, phông cầu cơ bản' },
  { value: 2.5, label: 'Trung bình yếu', description: 'Di chuyển cơ bản, bắt đầu biết đập cầu' },
  { value: 3.0, label: 'Trung bình', description: 'Đánh đôi ổn định, thủ và điều cầu tốt' },
  { value: 3.5, label: 'Trung bình khá', description: 'Phối hợp công thủ nhịp nhàng, ít lỗi' },
  { value: 4.0, label: 'Khá', description: 'Chiến thuật rõ ràng, lực cổ tay tốt' },
  { value: 4.5, label: 'Khá giỏi', description: 'Tốc độ cao, xử lý kỹ thuật đa dạng' },
  { value: 5.0, label: 'Bán chuyên', description: 'Trình độ giải đấu phong trào' },
];

export function getSkillLevelLabel(level: number): string {
  const found = SKILL_LEVEL_OPTIONS.find((opt) => opt.value === level);
  return found ? found.label : `${level.toFixed(1)} điểm`;
}
