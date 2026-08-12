import type { ChatMessage, FeromeetUser, Meet } from '../../domain/models';

export const people: FeromeetUser[] = [
  {
    id: 'lena',
    name: 'Лена',
    city: 'Минск',
    birthday: '1998-04-12',
    height: 168,
    rating: 4.9,
    readyToGo: 86,
    ferotags: ['ferotag_first_date', 'ferotag_between_the_lines', 'ferotag_a_night_out'],
    infotagCategories: [{ name: 'interests', infotags: ['inter_music', 'inter_bake', 'inter_jogg'] }],
    textAbout:
      'Ищу человека, с которым можно потеряться в новом городе и спорить о лучшей пасте.',
    isFavorite: true,
  },
  {
    id: 'mira',
    name: 'Мира',
    city: 'Вильнюс',
    birthday: '1999-08-03',
    height: 172,
    rating: 4.8,
    readyToGo: 71,
    ferotags: ['ferotag_home_gathering', 'ferotag_like_a_breeze'],
    textAbout: 'Коллекционирую красивые маршруты и истории людей.',
  },
  {
    id: 'sofia',
    name: 'София',
    city: 'Варшава',
    birthday: '2001-01-20',
    height: 165,
    rating: 4.7,
    readyToGo: 92,
    ferotags: ['ferotag_alone_with_tarantino', 'ferotag_guest_at_the_stove'],
    textAbout: 'За спонтанность, честность и свидания без сценария.',
    isFavorite: true,
  },
];

const stages = [
  { type: 'STAGE_1', status: 'DONE', title: 'Приглашение', subtitle: 'Приглашение принято', completed: true },
  { type: 'STAGE_2', status: 'CURRENT', title: 'Переписка', subtitle: 'Согласуйте детали', completed: false },
  { type: 'STAGE_3', status: 'HIDDEN', title: 'Встреча', subtitle: 'Скоро', completed: false },
];

export const meets: Meet[] = [
  {
    meetId: 1042,
    chatId: 'chat-lena',
    price: 120,
    ferotag: 'ferotag_first_date',
    expenseType: 'HALF',
    status: 'PLANNING',
    isYouHunter: true,
    isRated: false,
    isCancelled: false,
    hasUpdates: true,
    countUnreadMessages: 2,
    createdAt: '2026-08-12T16:00:00Z',
    stages,
    user: people[0]!,
  },
  {
    meetId: 1031,
    chatId: 'chat-sofia',
    price: 80,
    ferotag: 'ferotag_home_gathering',
    expenseType: 'HUNTER',
    status: 'PASSED',
    isYouHunter: false,
    isRated: true,
    score: 5,
    isCancelled: false,
    hasUpdates: false,
    countUnreadMessages: 0,
    createdAt: '2026-08-02T09:30:00Z',
    stages: stages.map((stage) => ({
      ...stage,
      status: 'DONE',
      subtitle: 'Готово',
      completed: true,
    })),
    user: people[2]!,
  },
];

export const demoMe: FeromeetUser = {
  id: 'me',
  name: 'Артём',
  city: 'Гродно',
  birthday: '1994-03-18',
  height: 174,
  readyToGo: 64,
  ferotags: ['ferotag_first_date', 'ferotag_home_gathering'],
  infotagCategories: [{ name: 'interests', infotags: ['inter_music', 'inter_jogg'] }],
  textAbout: 'Листай дальше, не твоего поля ягода.',
};

export const messages: ChatMessage[] = [
  {
    id: '1',
    senderId: 'lena',
    recipientId: 'me',
    chatId: 'chat-lena',
    content: 'Есть уютное место рядом с ратушей. Как тебе?',
    createdAt: '2026-08-12T16:04:00Z',
    status: 'READ',
  },
  {
    id: '2',
    senderId: 'me',
    recipientId: 'lena',
    chatId: 'chat-lena',
    content: 'Идеально. Давай в 19:30 — успею после работы.',
    createdAt: '2026-08-12T16:06:00Z',
    status: 'READ',
  },
  {
    id: '3',
    senderId: 'lena',
    recipientId: 'me',
    chatId: 'chat-lena',
    content: 'Договорились ✦ Я забронирую столик у окна.',
    createdAt: '2026-08-12T16:07:00Z',
    status: 'DELIVERED',
  },
];
