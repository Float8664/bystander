import type { BuildingType, BuildingShape, Position, TimeOfDay, Severity, CulturalContext } from './types'

// Базовая вероятность реакции одного человека в нейтральных условиях.
// Иллюстративно: выбрано как умеренно-оптимистичная точка отсчёта.
export const BASE_P = 0.5

// Степень затухания диффузии ответственности с ростом N.
// k=1.0 → линейное затухание 1/N. Иллюстративно.
export const DIFFUSION_K = 1.0

// Насколько личное знакомство повышает индивидуальную вероятность реакции.
// При acquaintance=true: pIndividual умножается на ACQUAINTANCE_FACTOR.
// Кривая pAtLeastOne сохраняет убывающую форму (эффект свидетеля не отменяется),
// просто приподнимается — каждый сосед лично ответственнее.
// Значение 1.5 — иллюстративное.
export const ACQUAINTANCE_FACTOR = 1.5

// Доля диффузии, снимаемой у адресата при addressed=true.
// 1.0 = диффузия полностью снята: p_addressee = p_context (не зависит от N).
// 0.0 = без эффекта. Значение 1.0 — иллюстративное, отражает логику Darley & Latané:
// адресное обращение разрушает «пусть поможет кто-то другой» у конкретного человека.
export const ADDRESSED_DIFFUSION_REMOVAL = 1.0

// Мультипликативные модификаторы для каждого параметра.
// Все значения иллюстративны; направления обоснованы в docs/model-rationale.md.

export const MODIFIER_SEVERITY: Record<Severity, number> = {
  minor:    0.5, // незначительная ситуация снижает мотивацию реагировать
  moderate: 1.0, // нейтральный референс
  serious:  1.6, // серьёзная ситуация увеличивает мотивацию
}

export const MODIFIER_TIME_OF_DAY: Record<TimeOfDay, number> = {
  morning: 1.1, // люди активны, спешат — чуть выше бдительность
  day:     1.2, // максимум активности и видимости
  evening: 0.9, // усталость, меньше людей на улице
  night:   0.6, // темнота, страх, изоляция снижают готовность реагировать
}

export const MODIFIER_BUILDING_TYPE: Record<BuildingType, number> = {
  khrushchevka: 1.1, // плотная застройка, соседи знают друг друга
  panel:        1.0, // нейтральный референс
  elite:        0.8, // анонимность, закрытость, охрана «разбирается сама»
  private:      1.2, // частный сектор — соседи ближе, выше личная ответственность
}

export const MODIFIER_POSITION: Record<Position, number> = {
  corner: 0.85, // угловая квартира — меньше общих стен, меньше слышно
  middle: 1.0,  // нейтральный референс
}

export const MODIFIER_CULTURAL_CONTEXT: Record<CulturalContext, number> = {
  high_solidarity: 1.3, // высокая взаимопомощь в сообществе
  mixed:           1.0, // нейтральный референс
  low_solidarity:  0.7, // атомизированное сообщество, низкое доверие
}

// ─── Охват свидетелей (вывод N из формы дома) ───────────────────────────────
// Всё ниже — про СТУПЕНЬ ОХВАТА (сколько соседей в принципе заметят), а не про
// вероятность реакции. Значения иллюстративные, см. docs/model-rationale.md.

// Типовые параметры дома по типу. Это СТАРТОВЫЕ дефолты: во втором заходе
// пользователь сможет переопределить их в UI. Из этих параметров
// computeWitnessCount выводит число соседей-свидетелей N.
export const BUILDING_DEFAULTS: Record<BuildingType, BuildingShape> = {
  // Хрущёвка: малоэтажная, плотные подъезды. Охват — свой подъезд.
  khrushchevka: { apartmentsPerFloor: 3, floors: 5,  entrances: 4, witnessScope: 'my_entrance' },
  // Панель: типовая 9-этажка. Охват — свой подъезд.
  panel:        { apartmentsPerFloor: 4, floors: 9,  entrances: 6, witnessScope: 'my_entrance' },
  // Элитный ЖК: высокий, анонимный. Реально слышат лишь ближние этажи —
  // охват сужен до своего этажа плюс соседних сверху/снизу.
  elite:        { apartmentsPerFloor: 6, floors: 16, entrances: 3, witnessScope: 'my_floor_plus_adjacent' },
  // Частный дом: N задаётся напрямую числом соседних домов, форма не используется.
  private:      { apartmentsPerFloor: 1, floors: 1,  entrances: 1, witnessScope: 'whole_building', neighboringHouses: 4 },
}

// Сколько соседних этажей попадает в охват при scope='my_floor_plus_adjacent':
// свой этаж + один выше + один ниже = 3. Иллюстративно.
export const ADJACENT_FLOORS_SPAN = 3

// Множитель охвата по позиции квартиры. Угловая квартира граничит с меньшим
// числом соседей, поэтому её круг свидетелей уже. Это про ОХВАТ (число N),
// и сознательно ОТДЕЛЁН от MODIFIER_POSITION (тот влияет на вероятность реакции).
// Значения иллюстративные.
export const POSITION_REACH_FACTOR: Record<Position, number> = {
  corner: 0.85, // угловая — меньше смежных квартир, уже охват
  middle: 1.0,  // нейтральный референс
}
