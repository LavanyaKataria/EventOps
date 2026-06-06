// Operations Copilot (Copilot) Controller

document.addEventListener("DOMContentLoaded", () => {
    const chatHistory = document.getElementById("copilot-chat-history");
    const inputBox = document.getElementById("copilot-input-box");
    const btnSend = document.getElementById("btn-send-copilot");
    const presetBtns = document.querySelectorAll(".btn-preset");

    // Send Message
    async function sendMessage(text) {
        if (!text.trim()) return;

        // 1. Add User Message
        appendMessage("user", "You", text);
        inputBox.value = "";
        
        // Scroll to bottom
        chatHistory.scrollTop = chatHistory.scrollHeight;

        // 2. Add Typing Indicator
        const typingId = appendTypingIndicator();
        chatHistory.scrollTop = chatHistory.scrollHeight;

        try {
            const response = await fetch("/api/copilot", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({ message: text })
            });
            const data = await response.json();
            
            // Remove typing indicator
            document.getElementById(typingId)?.remove();

            // 3. Add Bot Response
            appendMessage("bot", "EventOps Commander Copilot", data.reply);
        } catch (error) {
            console.error("Ops Copilot request failed:", error);
            document.getElementById(typingId)?.remove();
            appendMessage("bot", "System Error", "Warning: Critical connection timeout with the ops intelligence module. Re-attempting connection link...");
        }

        // Scroll to bottom
        chatHistory.scrollTop = chatHistory.scrollHeight;
    }

    // Append Chat bubble
    function appendMessage(sender, senderName, text) {
        const msgDiv = document.createElement("div");
        msgDiv.className = `chat-message ${sender}`;
        
        const nameHeader = document.createElement("h3");
        nameHeader.textContent = senderName;
        msgDiv.appendChild(nameHeader);

        const textBody = document.createElement("div");
        textBody.innerHTML = formatMarkdown(text);
        msgDiv.appendChild(textBody);

        chatHistory.appendChild(msgDiv);
    }

    // Typing Indicator helper
    function appendTypingIndicator() {
        const id = "typing-" + Date.now();
        const indicatorDiv = document.createElement("div");
        indicatorDiv.className = "chat-message bot flex items-center gap-1.5 py-3 px-4";
        indicatorDiv.id = id;
        
        indicatorDiv.innerHTML = `
            <h3>Ops Copilot</h3>
            <div class="flex items-center gap-1 mt-1">
                <span class="w-1.5 h-1.5 bg-cyan-400 rounded-full animate-bounce" style="animation-delay: 0.1s"></span>
                <span class="w-1.5 h-1.5 bg-cyan-400 rounded-full animate-bounce" style="animation-delay: 0.2s"></span>
                <span class="w-1.5 h-1.5 bg-cyan-400 rounded-full animate-bounce" style="animation-delay: 0.3s"></span>
            </div>
        `;
        chatHistory.appendChild(indicatorDiv);
        return id;
    }

    // Markdown Parser helper
    function formatMarkdown(rawText) {
        let text = rawText;
        
        // Escape HTML
        text = text
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;");

        // Heading format (### Heading)
        text = text.replace(/^### (.*$)/gim, '<h4 class="text-cyan-400 font-bold mt-2 mb-1 uppercase font-mono text-sm">$1</h4>');
        text = text.replace(/^## (.*$)/gim, '<h3 class="text-indigo-400 font-bold mt-3 mb-1 uppercase font-mono text-base">$1</h3>');
        text = text.replace(/^# (.*$)/gim, '<h2 class="text-white font-extrabold mt-4 mb-2 uppercase font-sans text-lg">$1</h2>');

        // Bold text (**bold**)
        text = text.replace(/\*\*(.*?)\*\*/g, '<strong class="font-bold text-cyan-400">$1</strong>');
        
        // Bullet points (convert * items)
        let lines = text.split('\n');
        let inList = false;
        
        for (let i = 0; i < lines.length; i++) {
            let line = lines[i].trim();
            if (line.startsWith('* ') || line.startsWith('- ')) {
                let content = line.substring(2);
                if (!inList) {
                    lines[i] = '<ul class="list-none space-y-1 my-2">' + `<li><span class="text-cyan-400 font-bold mr-1.5">•</span>${content}</li>`;
                    inList = true;
                } else {
                    lines[i] = `<li><span class="text-cyan-400 font-bold mr-1.5">•</span>${content}</li>`;
                }
            } else {
                if (inList) {
                    lines[i-1] += '</ul>';
                    inList = false;
                }
            }
        }
        if (inList) {
            lines[lines.length - 1] += '</ul>';
        }
        
        text = lines.join('\n');
        
        // Newlines to break
        text = text.replace(/\n/g, "<br>");
        
        return text;
    }

    // Wire listeners
    btnSend.addEventListener("click", () => sendMessage(inputBox.value));
    
    inputBox.addEventListener("keypress", (e) => {
        if (e.key === "Enter") {
            sendMessage(inputBox.value);
        }
    });

    presetBtns.forEach(btn => {
        btn.addEventListener("click", () => {
            const prompt = btn.getAttribute("data-prompt");
            sendMessage(prompt);
        });
    });
});