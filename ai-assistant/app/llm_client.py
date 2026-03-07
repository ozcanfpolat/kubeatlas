"""
LLM Client: LiteLLM'e bağlanır, tool calling loop'unu yönetir.

Akış:
1. Kullanıcı sorusu + tool tanımları → LiteLLM'e gönder
2. LiteLLM tool call döndürürse → tool'u çalıştır
3. Tool sonucunu LiteLLM'e geri gönder
4. LiteLLM son cevabı üretene kadar tekrarla
5. Son cevabı kullanıcıya dön
"""
import json
import logging
from openai import AsyncOpenAI
from app.config import settings
from app.tools import TOOLS, execute_tool

logger = logging.getLogger("llm-client")

SYSTEM_PROMPT = """Sen KubeAtlas AI Asistanısın. Kubernetes cluster'larını, namespace'leri, 
takımları, dependency'leri ve audit log'ları yönetmek için araçlara sahipsin.

Görevlerin:
- Kullanıcının sorularını anla ve uygun araçları çağır
- Araç sonuçlarını analiz edip anlamlı özetler sun
- Türkçe veya İngilizce sorulara aynı dilde cevap ver
- Teknik detayları anlaşılır şekilde açıkla
- Birden fazla araç çağırabilirsin (örn: önce cluster'ları listele, sonra detaylarını al)

Önemli: Sadece araçlardan gelen gerçek verileri kullan, uydurma yapma."""

MAX_TOOL_ROUNDS = 5  # Sonsuz döngüyü engelle


async def chat(user_message: str, history: list[dict] = None) -> str:
    """
    Kullanıcı mesajını al, LiteLLM ile tool calling loop çalıştır, cevap dön.
    """
    client = AsyncOpenAI(
        base_url=settings.litellm_base_url,
        api_key=settings.litellm_api_key,
    )

    # Mesaj geçmişini oluştur
    messages = [{"role": "system", "content": SYSTEM_PROMPT}]

    if history:
        messages.extend(history)

    messages.append({"role": "user", "content": user_message})

    # Tool calling loop
    for round_num in range(MAX_TOOL_ROUNDS):
        logger.info(f"LLM call round {round_num + 1}")

        try:
            response = await client.chat.completions.create(
                model=settings.litellm_model,
                messages=messages,
                tools=TOOLS,
                tool_choice="auto",
            )
        except Exception as e:
            logger.error(f"LLM API error: {e}")
            return f"LLM bağlantı hatası: {str(e)}"

        choice = response.choices[0]
        assistant_message = choice.message

        # Mesajı geçmişe ekle
        messages.append(assistant_message.model_dump())

        # Tool call yoksa → son cevap
        if not assistant_message.tool_calls:
            return assistant_message.content or "Cevap üretilemedi."

        # Tool call'ları çalıştır
        for tool_call in assistant_message.tool_calls:
            fn_name = tool_call.function.name
            fn_args = json.loads(tool_call.function.arguments)

            logger.info(f"Executing tool: {fn_name}({fn_args})")
            result = await execute_tool(fn_name, fn_args)
            logger.info(f"Tool result length: {len(result)} chars")

            # Sonucu mesaj geçmişine ekle
            messages.append({
                "role": "tool",
                "tool_call_id": tool_call.id,
                "content": result,
            })

    return "Maksimum tool çağrı sayısına ulaşıldı. Lütfen soruyu daraltarak tekrar deneyin."


async def chat_stream(user_message: str, history: list[dict] = None):
    """
    Streaming versiyonu - tool calling loop'u çalıştırır,
    son cevabı token token yield eder.
    """
    client = AsyncOpenAI(
        base_url=settings.litellm_base_url,
        api_key=settings.litellm_api_key,
    )

    messages = [{"role": "system", "content": SYSTEM_PROMPT}]
    if history:
        messages.extend(history)
    messages.append({"role": "user", "content": user_message})

    for round_num in range(MAX_TOOL_ROUNDS):
        logger.info(f"LLM stream round {round_num + 1}")

        try:
            # İlk çağrılarda streaming kapalı (tool call tespiti için)
            response = await client.chat.completions.create(
                model=settings.litellm_model,
                messages=messages,
                tools=TOOLS,
                tool_choice="auto",
            )
        except Exception as e:
            yield f"LLM bağlantı hatası: {str(e)}"
            return

        choice = response.choices[0]
        assistant_message = choice.message
        messages.append(assistant_message.model_dump())

        if not assistant_message.tool_calls:
            # Son cevap - bunu streaming ile gönder
            if assistant_message.content:
                yield assistant_message.content
            else:
                yield "Cevap üretilemedi."
            return

        # Tool call bilgisini kullanıcıya bildir
        tool_names = [tc.function.name for tc in assistant_message.tool_calls]
        yield f"🔧 Araçlar çağrılıyor: {', '.join(tool_names)}...\n\n"

        for tool_call in assistant_message.tool_calls:
            fn_name = tool_call.function.name
            fn_args = json.loads(tool_call.function.arguments)

            logger.info(f"Executing tool: {fn_name}({fn_args})")
            result = await execute_tool(fn_name, fn_args)

            messages.append({
                "role": "tool",
                "tool_call_id": tool_call.id,
                "content": result,
            })

    yield "Maksimum tool çağrı sayısına ulaşıldı."
