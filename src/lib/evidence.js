export function evidenceStrength(count) {
  if (count >= 5) return "strong";
  if (count >= 3) return "emerging";
  return "weak";
}

export const STRENGTH_LABEL = {
  weak: "약함",
  emerging: "부상 중",
  strong: "강함"
};

export const STRENGTH_CLASSES = {
  weak: "bg-amber-50 text-amber-700 border-amber-200",
  emerging: "bg-blue-50 text-blue-700 border-blue-200",
  strong: "bg-emerald-50 text-emerald-700 border-emerald-200"
};

export const DIMENSION_LABEL = {
  prediction_accuracy: "예측 정확도",
  repeated_incorrect_assumptions: "반복되는 잘못된 가정",
  decision_reversals: "결정 전환",
  estimation_bias: "추정 편향",
  research_before_decision: "결정 전 검증 행동",
  tool_selection: "도구/기술 선택",
  persistence_vs_switching: "지속 vs 전환",
  category_patterns: "카테고리 패턴"
};

export const PROFILE_LABEL = {
  estimates_well: "잘 추정하는 것",
  systematically_underestimate: "체계적으로 과소평가하는 것",
  systematically_overestimate: "체계적으로 과대평가하는 것",
  common_direction_changes: "방향을 바꾸는 일반적 이유",
  frequent_failed_assumptions: "가장 빈번한 실패 가정",
  better_than_expected: "예상보다 좋았던 결정",
  worse_than_expected: "예상보다 나빴던 결정",
  insufficient_evidence: "증거가 부족한 영역"
};