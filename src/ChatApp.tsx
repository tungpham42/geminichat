import React, { useEffect, useRef, useState, JSX } from "react";
import "bootstrap/dist/css/bootstrap.min.css";
import {
  Container,
  Row,
  Col,
  Form,
  Button,
  ListGroup,
  InputGroup,
  Spinner,
  Badge,
} from "react-bootstrap";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faPaperPlane,
  faRobot,
  faUser,
  faTrash,
} from "@fortawesome/free-solid-svg-icons";

type Role = "user" | "assistant" | "system";

type Message = {
  id: string;
  role: Role;
  text: string;
  createdAt: number;
};

const STORAGE_KEY = "genai_chat_history_v1";

export default function ChatApp(): JSX.Element {
  const [messages, setMessages] = useState<Message[]>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw
        ? (JSON.parse(raw) as Message[])
        : [
            {
              id: "m-system",
              role: "system",
              text: "Bạn đang nói chuyện với AI (GenAI).",
              createdAt: Date.now(),
            },
          ];
    } catch (e) {
      return [
        {
          id: "m-system",
          role: "system",
          text: "Bạn đang nói chuyện với AI (GenAI).",
          createdAt: Date.now(),
        },
      ];
    }
  });
  const [input, setInput] = useState("");
  const [isSending, setIsSending] = useState(false);
  const listRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(messages));
    if (listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
    }
  }, [messages]);

  function addMessage(msg: Message) {
    setMessages((prev) => [...prev, msg]);
  }

  async function handleSend(e?: React.FormEvent) {
    e?.preventDefault();
    const text = input.trim();
    if (!text) return;

    const userMsg: Message = {
      id: `u-${Date.now()}`,
      role: "user",
      text,
      createdAt: Date.now(),
    };
    addMessage(userMsg);
    setInput("");
    setIsSending(true);

    try {
      // POST to Netlify serverless function
      const res = await fetch("/.netlify/functions/genai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [...messages, userMsg].map((m) => ({
            role: m.role,
            content: m.text,
          })),
        }),
      });

      if (!res.ok) {
        const txt = await res.text();
        throw new Error(`Server error: ${res.status} - ${txt}`);
      }

      const data = await res.json();
      const assistantMsg: Message = {
        id: `a-${Date.now()}`,
        role: "assistant",
        text: data.reply ?? "(empty reply)",
        createdAt: Date.now(),
      };
      addMessage(assistantMsg);
    } catch (err: any) {
      const errMsg: Message = {
        id: `e-${Date.now()}`,
        role: "assistant",
        text: `Lỗi: ${err.message || err}`,
        createdAt: Date.now(),
      };
      addMessage(errMsg);
    } finally {
      setIsSending(false);
    }
  }

  function clearHistory() {
    setMessages([]);
    localStorage.removeItem(STORAGE_KEY);
  }

  return (
    <Container style={{ maxWidth: 900, marginTop: 24 }}>
      <Row>
        <Col>
          <h3>
            <FontAwesomeIcon icon={faRobot} /> AI Chat Bot
            <Badge bg="secondary" style={{ marginLeft: 8 }}>
              GenAI
            </Badge>
          </h3>
          <p className="text-muted">
            React + TypeScript + React Bootstrap + FontAwesome, calling a
            Netlify serverless function that uses @google/genai.
          </p>
        </Col>
      </Row>

      <Row>
        <Col>
          <div
            ref={listRef}
            style={{
              height: 400,
              overflowY: "auto",
              border: "1px solid #eee",
              borderRadius: 8,
              padding: 12,
            }}
          >
            <ListGroup variant="flush">
              {messages.map((m) => (
                <ListGroup.Item
                  key={m.id}
                  className={m.role === "user" ? "text-end" : ""}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent:
                        m.role === "user" ? "flex-end" : "flex-start",
                      gap: 8,
                    }}
                  >
                    <div style={{ maxWidth: "75%" }}>
                      <div style={{ fontSize: 12, color: "#666" }}>
                        {m.role === "user" ? (
                          <>
                            <FontAwesomeIcon icon={faUser} /> You
                          </>
                        ) : (
                          <>
                            <FontAwesomeIcon icon={faRobot} /> AI
                          </>
                        )}
                        <span style={{ marginLeft: 8, fontSize: 11 }}>
                          {new Date(m.createdAt).toLocaleTimeString()}
                        </span>
                      </div>
                      <div
                        style={{
                          marginTop: 6,
                          whiteSpace: "pre-wrap",
                          background: m.role === "user" ? "#e9f7ff" : "#f8f9fa",
                          padding: 10,
                          borderRadius: 6,
                        }}
                      >
                        {m.text}
                      </div>
                    </div>
                  </div>
                </ListGroup.Item>
              ))}
            </ListGroup>
          </div>
        </Col>
      </Row>

      <Row style={{ marginTop: 12 }}>
        <Col>
          <Form onSubmit={handleSend}>
            <InputGroup>
              <Form.Control
                placeholder="Nhập câu hỏi của bạn..."
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) handleSend();
                }}
                as="textarea"
                rows={2}
                disabled={isSending}
              />
              <Button variant="primary" type="submit" disabled={isSending}>
                {isSending ? (
                  <>
                    <Spinner animation="border" size="sm" /> Sending
                  </>
                ) : (
                  <>
                    <FontAwesomeIcon icon={faPaperPlane} /> Send
                  </>
                )}
              </Button>
              <Button
                variant="outline-danger"
                onClick={clearHistory}
                title="Clear history"
                style={{ marginLeft: 8 }}
              >
                <FontAwesomeIcon icon={faTrash} />
              </Button>
            </InputGroup>
          </Form>
        </Col>
      </Row>

      <Row style={{ marginTop: 16 }}>
        <Col className="text-muted">
          <small>
            This frontend never stores API keys. Requests go through a Netlify
            serverless function that calls @google/genai.
          </small>
        </Col>
      </Row>
    </Container>
  );
}
