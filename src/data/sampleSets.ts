import type { VocabularySet } from '../types/vocabulary'

export const MAX_WORDS_PER_SET = 500

function sample(id: string, name: string, entries: [string, string][]): VocabularySet {
  return {
    id: `sample-${id}`,
    name,
    words: entries.map(([word, meaning]) => ({ id: `sample-${id}-${word}`, word, meaning })),
  }
}

export const basicSet: VocabularySet = {
  id: 'basic-english',
  name: 'Basic English',
  words: [
    ['apple', 'quả táo'], ['banana', 'quả chuối'], ['cat', 'con mèo'],
    ['dog', 'con chó'], ['house', 'ngôi nhà'], ['school', 'trường học'],
    ['book', 'quyển sách'], ['water', 'nước'], ['computer', 'máy tính'],
    ['friend', 'bạn bè'],
  ].map(([word, meaning]) => ({ id: `demo-${word}`, word, meaning })),
}

export const topicSets: VocabularySet[] = [
  sample('animals', 'Animals', [
    ['ant', 'con kiến'], ['bear', 'con gấu'], ['bee', 'con ong'], ['bird', 'con chim'],
    ['butterfly', 'con bướm'], ['cat', 'con mèo'], ['chicken', 'con gà'], ['cow', 'con bò'],
    ['crab', 'con cua'], ['deer', 'con hươu'], ['dog', 'con chó'], ['dolphin', 'cá heo'],
    ['duck', 'con vịt'], ['eagle', 'đại bàng'], ['elephant', 'con voi'], ['fish', 'con cá'],
    ['fox', 'con cáo'], ['frog', 'con ếch'], ['goat', 'con dê'], ['horse', 'con ngựa'],
    ['lion', 'sư tử'], ['monkey', 'con khỉ'], ['mouse', 'con chuột'], ['owl', 'con cú'],
    ['panda', 'gấu trúc'], ['pig', 'con lợn'], ['rabbit', 'con thỏ'], ['shark', 'cá mập'],
    ['sheep', 'con cừu'], ['tiger', 'con hổ'], ['turtle', 'con rùa'], ['whale', 'cá voi'],
    ['wolf', 'con sói'], ['zebra', 'ngựa vằn'],
  ]),
  sample('vehicles', 'Vehicles', [
    ['airplane', 'máy bay'], ['ambulance', 'xe cứu thương'], ['bicycle', 'xe đạp'],
    ['boat', 'thuyền'], ['bus', 'xe buýt'], ['canoe', 'xuồng'], ['car', 'ô tô'],
    ['ferry', 'phà'], ['helicopter', 'trực thăng'], ['jeep', 'xe jeep'],
    ['kayak', 'thuyền kayak'], ['limousine', 'xe limousine'], ['motorcycle', 'xe máy'],
    ['rocket', 'tên lửa'], ['sailboat', 'thuyền buồm'], ['scooter', 'xe tay ga'],
    ['ship', 'tàu thủy'], ['skateboard', 'ván trượt'], ['subway', 'tàu điện ngầm'],
    ['taxi', 'xe taxi'], ['tractor', 'máy kéo'], ['train', 'tàu hỏa'],
    ['tram', 'xe điện'], ['truck', 'xe tải'], ['van', 'xe van'], ['yacht', 'du thuyền'],
  ]),
  sample('colors', 'Colors', [
    ['beige', 'màu be'], ['black', 'màu đen'], ['blue', 'màu xanh dương'],
    ['brown', 'màu nâu'], ['coral', 'màu san hô'], ['cream', 'màu kem'],
    ['cyan', 'màu xanh lơ'], ['gold', 'màu vàng kim'], ['gray', 'màu xám'],
    ['green', 'màu xanh lá'], ['indigo', 'màu chàm'], ['ivory', 'màu trắng ngà'],
    ['lavender', 'màu tím oải hương'], ['lime', 'màu xanh chanh'],
    ['magenta', 'màu đỏ tím'], ['maroon', 'màu đỏ nâu'], ['navy', 'màu xanh hải quân'],
    ['olive', 'màu xanh ô liu'], ['orange', 'màu cam'], ['pink', 'màu hồng'],
    ['purple', 'màu tím'], ['red', 'màu đỏ'], ['silver', 'màu bạc'],
    ['teal', 'màu xanh lục lam'], ['turquoise', 'màu xanh ngọc lam'],
    ['violet', 'màu tím hoa cà'], ['white', 'màu trắng'], ['yellow', 'màu vàng'],
  ]),
  sample('food', 'Food', [
    ['bread', 'bánh mì'], ['butter', 'bơ'], ['cake', 'bánh ngọt'], ['carrot', 'cà rốt'],
    ['cheese', 'phô mai'], ['chicken', 'thịt gà'], ['chocolate', 'sô cô la'],
    ['coffee', 'cà phê'], ['corn', 'ngô'], ['egg', 'trứng'], ['fish', 'cá'],
    ['grape', 'nho'], ['honey', 'mật ong'], ['juice', 'nước ép'], ['lemon', 'chanh'],
    ['mango', 'xoài'], ['milk', 'sữa'], ['noodle', 'mì'], ['onion', 'hành tây'],
    ['orange', 'cam'], ['pasta', 'mì Ý'], ['peach', 'đào'], ['pear', 'lê'],
    ['potato', 'khoai tây'], ['rice', 'cơm'], ['salad', 'rau trộn'],
    ['soup', 'súp'], ['strawberry', 'dâu tây'], ['tea', 'trà'], ['tomato', 'cà chua'],
  ]),
  sample('nature', 'Nature', [
    ['beach', 'bãi biển'], ['cloud', 'đám mây'], ['desert', 'sa mạc'],
    ['earth', 'trái đất'], ['fire', 'lửa'], ['flower', 'bông hoa'],
    ['forest', 'rừng'], ['garden', 'khu vườn'], ['grass', 'cỏ'],
    ['hill', 'đồi'], ['island', 'hòn đảo'], ['lake', 'hồ'], ['leaf', 'lá cây'],
    ['moon', 'mặt trăng'], ['mountain', 'núi'], ['ocean', 'đại dương'],
    ['rain', 'mưa'], ['river', 'sông'], ['rock', 'đá'], ['sand', 'cát'],
    ['sea', 'biển'], ['sky', 'bầu trời'], ['snow', 'tuyết'], ['star', 'ngôi sao'],
    ['storm', 'cơn bão'], ['sun', 'mặt trời'], ['tree', 'cây'],
    ['valley', 'thung lũng'], ['waterfall', 'thác nước'], ['wind', 'gió'],
  ]),
]

export const initialSets: VocabularySet[] = [basicSet, ...topicSets]
