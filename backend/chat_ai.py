import random
import time
import re
import sys
import signal
import logging
from openai import OpenAI

client = OpenAI(base_url="http://localhost:1234/v1", api_key="lm-studio")
MODEL_NAME = "lmstudio-community/qwen2.5-14b-instruct-1m"

# ---- Параметры симуляции ----
SLEEP_TIME = 3
CONTEXT_LIMIT = 6
MAX_TOKENS = 160
CHAT_HISTORY_LIMIT = 400
MEMORY_MAX = 80
MEMORY_SUMMARY_LEN = 3
INITIAL_TOPIC = "информатика и IT"
ALLOW_MILD_PROFANITY = True

# ---- Агенты ----
agents = {
    "Даша": {"role": "флористка, тёплые метафоры с цветами, 1–2 предложения.", "memory": []},
    "Кирилл": {"role": "шеф-повар, сарказм, кулинарные аналогии, 1–2 предложения.", "memory": []},
    "Ника": {"role": "спортсменка, энергичная, короткие фразы, эмодзи уместны.", "memory": []},
    "Дмитрий": {"role": "аспирант, научные метафоры, философичность, 1–2 предложения.", "memory": []}
}

relationships = {a: {b: 0.5 for b in agents if b != a} for a in agents}
relationship_history = []

NOISE_PATTERNS = [
    r"\bim_start\b",
    r"\bim_end\b",
    r"\[INST\b",
    r"\[/?INST\]",
    r"<\|endoftext\|>",
    r"(^|\s)limburg(\s|$)",
    r"\b[A-Za-z0-9_/\\]{6,}\b"
]

COMMON_REPAIRS = {
    "почемужу": "почему же",
    "почемуж": "почему же",
    "почемуто": "почему-то",
    "чё": "что",
    "чёта": "что-то",
    "че": "что",
    "нормалньо": "нормально",
    "вобщем": "в общем",
    "отвлечтония": "отвлечения",
    "творчтоство": "творчество"
}


COMPILED_NOISE = []
for patt in NOISE_PATTERNS:
    try:
        COMPILED_NOISE.append(re.compile(patt, flags=re.IGNORECASE))
    except re.error as e:
        logging.warning("Invalid noise pattern skipped: %r -> %s", patt, e)

def normalize_spaces(text: str) -> str:
    text = re.sub(r"\s+", " ", text).strip()
    return text

def fix_common_errors(text: str) -> str:
    if not text:
        return text
    t = text
    for cre in COMPILED_NOISE:
        t = cre.sub(" ", t)
    t = re.sub(r"[\x00-\x1F\x7F]+", " ", t)
    for bad, good in COMMON_REPAIRS.items():
        t = re.sub(re.escape(bad), good, t, flags=re.IGNORECASE)
    t = re.sub(r"([а-яёА-ЯЁ])\?([А-ЯЁа-яё])", r"\1? \2", t)
    t = re.sub(r"([,.!?:;])([^\s])", r"\1 \2", t)
    t = normalize_spaces(t)
    t = re.sub(r'\s+"', ' "', t)
    t = re.sub(r'"\s+', '" ', t)
    return t

def clean_and_trim(text: str, agent_name: str = "") -> str:
    if not text:
        return "..."
    t = str(text).strip()
    if agent_name:
        t = re.sub(rf"^{re.escape(agent_name)}[,:\s\-—–]*", " ", t, flags=re.IGNORECASE)
    t = fix_common_errors(t)
    allowed = "[^А-Яа-яЁё0-9\\s\\.,!\\?\\:;—–()\\-\"'«»…%€$:@/\\+\\n]"
    t = re.sub(allowed, " ", t)

    t = normalize_spaces(t)
    sentences = re.split(r'(?<=[.!?])\s+', t)
    sentences = [s.strip() for s in sentences if s.strip()]
    if not sentences:
        return "..."
    t = " ".join(sentences[:2])
    if t and t[-1] not in ".!?":
        t += "."
    if len(t) > 300:
        t = t[:297].rstrip() + "..."
    return t

def jaccard_similarity(a: str, b: str) -> float:
    wa = set(re.findall(r"\w+", a.lower()))
    wb = set(re.findall(r"\w+", b.lower()))
    if not wa and not wb:
        return 0.0
    return len(wa.intersection(wb)) / max(1, len(wa.union(wb)))

def memory_summary(agent_name: str) -> str:
    mem = agents[agent_name]["memory"]
    if not mem:
        return ""
    return " | ".join(mem[-MEMORY_SUMMARY_LEN:])

def build_prompt(agent_name: str, last_speaker: str, last_text: str, chat_history: list, topic: str) -> str:
    role = agents[agent_name]["role"]
    mem = memory_summary(agent_name)
    context = "\n".join([f"[{m['name']}]: {m['text']}" for m in chat_history[-CONTEXT_LIMIT:]])
    instr = (
        f"{role}\nТема: «{topic}». Не сворачивать.\n"
        f"Правила: 1) Без markdown. 2) Не цитируй дословно. 3) Обратись к {last_speaker} по имени. 4) 1–2 предложения.\n"
    )
    if ALLOW_MILD_PROFANITY:
        instr += "Допускается мягкая грубость в адрес идеи.\n"
    prompt = (
        instr +
        ("\nПамять: " + mem + "\n" if mem else "\n") +
        "Контекст:\n" + (context if context else "—") + "\n\n" +
        f"{last_speaker}: \"{last_text}\"\n\nОтвет {agent_name.strip()}: "
    )
    return prompt


def call_model(prompt: str) -> str:
    try:
        messages = [{"role": "user", "content": prompt}]
        resp = client.chat.completions.create(
            model=MODEL_NAME,
            messages=messages,
            temperature=0.65,
            max_tokens=MAX_TOKENS,
            frequency_penalty=0.6,
            presence_penalty=0.6,
            stop=["\n\n", "[INST"]
        )
        choice = None
        if hasattr(resp, "choices") and resp.choices:
            choice = resp.choices[0]
            if hasattr(choice, "message") and getattr(choice.message, "content", None) is not None:
                text = choice.message.content
            else:
                text = getattr(choice, "text", None)
        else:
            text = None

        if text is None:
            text = getattr(resp, "text", None) or "..."
        return str(text)
    except Exception as e:
        logging.exception("Ошибка модели при вызове API")
        return "..."


def ensure_direct_reply(agent_name: str, raw: str, last_speaker: str, last_text: str, topic: str,
                        recent_msgs: list) -> str:
    cleaned = clean_and_trim(raw, agent_name)
    tokenized = re.split(r"\W+", cleaned)
    if last_speaker not in tokenized:
        strict = f"СРОЧНО: Обратись к {last_speaker} по имени. Без цитат. Коротко."
        raw2 = call_model(build_prompt(agent_name, last_speaker, last_text, recent_msgs, topic) + "\n\n" + strict)
        cleaned = clean_and_trim(raw2, agent_name)
    sims = [jaccard_similarity(cleaned, m["text"]) for m in recent_msgs[-6:]] if recent_msgs else []
    if sims and max(sims) > 0.6:
        cleaned = f"{last_speaker}, идея интересна, но давай копнём глубже."
    if len(cleaned) <= 5:
        return f"{last_speaker}, поясни мысль конкретнее."
    return cleaned

def remember(agent_name: str, note: str):
    n = note.strip()
    if not n:
        return
    mem = agents[agent_name]["memory"]
    if mem and mem[-1] == n:
        return
    mem.append(n)
    if len(mem) > MEMORY_MAX:
        mem.pop(0)

def update_relationships(speaker: str, target: str, text: str):
    t = text.lower()
    delta = 0.0
    if any(w in t for w in ["не соглас", "туп", "идиот", "дурак"]):
        delta -= 0.06
    if any(w in t for w in ["прав", "соглас", "молодец", "красиво", "хорошо"]):
        delta += 0.04
    newv = max(0.0, min(1.0, relationships[speaker][target] + delta))
    relationships[speaker][target] = newv
    relationships[target][speaker] = newv

def save_graph():
    try:
        import matplotlib.pyplot as plt
        if len(relationship_history) < 2:
            return
        plt.figure(figsize=(10, 6))
        pairs = [(a, b) for a in sorted(relationships) for b in sorted(relationships[a]) if a < b]
        colors = ['blue', 'orange', 'green', 'red', 'purple', 'brown', 'pink', 'gray']
        for i, (a, b) in enumerate(pairs):
            values = [snap.get(a, {}).get(b, 0.5) for snap in relationship_history]
            plt.plot(values, label=f"{a}-{b}", color=colors[i % len(colors)], linewidth=2)
        plt.ylim(0, 1)
        plt.title("Динамика взаимоотношений")
        plt.legend(fontsize=8)
        plt.grid(True, alpha=0.25)
        plt.savefig("relationships.png", dpi=150, bbox_inches='tight')
        plt.close()
    except Exception:
        logging.debug("Не удалось сохранить график.", exc_info=True)

def get_response_for(agent_name: str, chat_history: list, topic: str) -> str:
    last = chat_history[-1] if chat_history else {"name": "Никто", "text": ""}
    prompt = build_prompt(agent_name, last["name"], last["text"], chat_history, topic)
    raw = call_model(prompt)
    return ensure_direct_reply(agent_name, raw, last["name"], last["text"], topic, chat_history)

def simulate_dialog():
    topic = INITIAL_TOPIC
    chat_history = []
    starter = "Даша"
    starter_text = "Всем привет! У меня пионы — давайте обсудим, как цветы влияют на творчество."
    print(f"[{starter}]: {starter_text}")
    chat_history.append({"name": starter, "text": starter_text})
    remember(starter, starter_text)
    last_speakers = [starter]
    turn = 0
    try:
        while True:
            time.sleep(SLEEP_TIME)
            available = [n for n in agents if n not in last_speakers[-2:]]
            if not available:
                available = [n for n in agents if n != last_speakers[-1]]
            speaker = random.choice(available)
            response = get_response_for(speaker, chat_history, topic)
            if len(response) < 5:
                response = f"{chat_history[-1]['name']}, поясни конкретнее."
            print(f"[{speaker}]: {response}")
            chat_history.append({"name": speaker, "text": response})
            remember(speaker, f"{speaker}: {response}")
            if len(chat_history) > CHAT_HISTORY_LIMIT:
                removed = chat_history.pop(0)
                for a in agents:
                    remember(a, f"Ранее: {removed['name']}: {removed['text']}")
            target = last_speakers[-1] if last_speakers else random.choice([n for n in agents if n != speaker])
            update_relationships(speaker, target, response)
            last_speakers.append(speaker)
            if len(last_speakers) > 3:
                last_speakers.pop(0)
            turn += 1
            if turn % 10 == 0:
                relationship_history.append({k: dict(v) for k, v in relationships.items()})
                save_graph()
    except KeyboardInterrupt:
        relationship_history.append({k: dict(v) for k, v in relationships.items()})
        save_graph()
        print("\nОстановлено пользователем.")
        sys.exit(0)


if __name__ == "__main__":
    signal.signal(signal.SIGINT, lambda s, f: (_ for _ in ()).throw(KeyboardInterrupt()))
    simulate_dialog()