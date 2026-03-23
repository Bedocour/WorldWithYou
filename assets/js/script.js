const container = document.getElementById('canvas-container');

let imageSources = [];
let points = [];
let activeIndex = 0;
let TOTAL_POINTS = 0; // Фиксированное количество примитивов

const SCALE = 60; // Масштаб сердца
const SQUARE_SIZE = SCALE * 6.0;


// 1. Математическая проверка попадания точки внутрь сердца
// Формула: (x^2 + y^2 - 1)^3 - x^2 * y^3 <= 0
function isInsideHeart(x, y) {
    // Нормализуем координаты для стандартного уравнения сердца
    const nx = x / 13; 
    const ny = -y / 13; // Инверсия Y для канваса
    return Math.pow(nx * nx + ny * ny - 1, 3) - nx * nx * Math.pow(ny, 3) <= 0;
}

// 2. Равномерное распределение точек внутри области
function generatePoints() {
    const foundPoints = [];
    const attemptsLimit = 5000;
    let attempts = 0;
    let currentMinDistance = 3.2;

    while (foundPoints.length < TOTAL_POINTS && attempts < attemptsLimit) {
        // 1. Генерируем случайный угол t от 0 до 2PI
        const t = Math.random() * Math.PI * 2;
        
        // 2. Генерируем случайный радиус r (от 0 до 1), 
        // чтобы заполнять внутренность, а не только контур
        const r = Math.sqrt(Math.random()); 

        // 3. НОВАЯ ВЫРАЖЕННАЯ ФОРМУЛА
        // x = 16 * sin^3(t)
        // y = 13 * cos(t) - 5 * cos(2t) - 2 * cos(3t) - cos(4t)
        let rx = 16 * Math.pow(Math.sin(t), 3);
        let ry = -(13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t));

        // Применяем радиус для заполнения внутренности
        rx *= r;
        ry *= r;

        // 4. Проверка на дистанцию (чтобы не слипались)
        const tooClose = foundPoints.some(p => {
            const dx = p.x - rx;
            const dy = p.y - ry;
            return Math.sqrt(dx*dx + dy*dy) < currentMinDistance; 
        });

        if (!tooClose) {
            foundPoints.push({ x: rx, y: ry });
        }

        attempts++;
        if (attempts % 150 === 0) currentMinDistance *= 0.97;
    }

    // Перемешиваем массив, чтобы квадратики появлялись в случайном порядке
    return foundPoints.sort(() => Math.random() - 0.5);
}

async function init() {
    try {
        const response = await fetch('./assets/imgs/memo_list.json');
        imageSources = await response.json();

        imageSources.sort(() => Math.random() - 0.5);

        TOTAL_POINTS = imageSources.length;

        if (TOTAL_POINTS === 0) {
            console.error("Список фотографий пуст!");
            return;
        }
    } catch (e) {
        console.error("Ошибка загрузки имен картинок", e);
        return;
    }

    points = generatePoints();

    points.forEach((pos, index) => {
        // Создаем фоновую точку (подложку)
        const dot = document.createElement('div');
        dot.className = 'point';
        dot.style.left = `${300 + pos.x * SCALE}px`;
        dot.style.top = `${300 + pos.y * SCALE}px`;
        container.appendChild(dot);

        // Создаем скрытый квадратик (примитив)
        const sq = document.createElement('img');
        sq.className = 'square';
        sq.id = `sq-${index}`;
        sq.style.width = `${SQUARE_SIZE}px`;
        sq.style.height = `${SQUARE_SIZE}px`;
        // Берем картинку по кругу, если точек больше, чем фото
        const imgSrc = imageSources[index % imageSources.length];
        sq.src = `./assets/imgs/memories/${imgSrc}`;
        sq.style.objectFit = 'cover'; // Чтобы фото не сплющивалось

        // Добавляем шум смещения и случайный поворот
        const noiseX = (Math.random() - 0.5) * 8;
        const noiseY = (Math.random() - 0.5) * 8;
        const randomRotation = (Math.random() - 0.5) * 15;

        sq.style.left = `${300 + pos.x * SCALE + noiseX}px`;
        sq.style.top = `${300 + pos.y * SCALE + noiseY}px`;

        // Начальное состояние для GSAP
        gsap.set(sq, { rotation: randomRotation, scale: 2, opacity: 0 });

        container.appendChild(sq);
    });
}

// 3. Обработка скролла
function handleScroll(event) {
    hideInstructions();
    if (event.deltaY > 0) {
        // Скролл вниз - добавляем квадратик
        if (activeIndex < TOTAL_POINTS) {
            showSquare(activeIndex);
            activeIndex++;

            // ПРОВЕРКА: Если это был последний кубик
            if (activeIndex === TOTAL_POINTS) {
                // Вызываем зум не мгновенно, а через небольшую паузу (например, 500мс)
                // Чтобы пользователь увидел финальный упавший кубик
                setTimeout(finalZoomOut, 500);
            }
        }
    } else {
        // Скролл вверх - убираем квадратик
        if (activeIndex > 0) {
            activeIndex--;
            hideSquare(activeIndex);
        }
    }
}

function hideInstructions() {
    // Если у тебя есть инструкции или подписи, их можно плавно скрыть
    gsap.to(".instructions", {
        opacity: 0,
        duration: 1
    });
}

function showSquare(index) {
    const el = document.getElementById(`sq-${index}`);
    gsap.to(el, {
        scale: 1,
        opacity: 1,
        duration: 0.6,
        rotation: (Math.random() - 0.5) * 120,
        ease: "back.out(1.4)"
    });
}

function hideSquare(index) {
    const el = document.getElementById(`sq-${index}`);
    gsap.to(el, {
        scale: 2,
        opacity: 0,
        duration: 0.4,
        rotation: (Math.random() - 0.5) * 15,
        ease: "power2.in"
    });
}

function finalZoomOut() {
    gsap.to("#canvas-container", {
        scale: 0.25,
        duration: 2,
        ease: "power2.inOut"
    });
}

window.addEventListener('wheel', handleScroll);
window.onload = init;