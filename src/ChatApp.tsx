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
  Card,
} from "react-bootstrap";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faPaperPlane,
  faRobot,
  faUser,
  faTrash,
} from "@fortawesome/free-solid-svg-icons";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

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
              text: "You are talking with AI.",
              createdAt: Date.now(),
            },
          ];
    } catch (e) {
      return [
        {
          id: "m-system",
          role: "system",
          text: "You are talking with AI.",
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
    <Container className="mt-5" style={{ maxWidth: "900px" }}>
      {/* Header */}
      <Row className="mb-3 text-center">
        <Col>
          <h3 className="fw-bold">
            <FontAwesomeIcon icon={faRobot} className="me-2 text-primary" />
            AI Chatbot
          </h3>
        </Col>
      </Row>

      {/* Chat Messages */}
      <Row>
        <Col>
          <Card
            style={{
              height: 450,
              borderRadius: 12,
              boxShadow: "0 4px 15px rgba(0,0,0,0.05)",
              overflow: "hidden",
            }}
          >
            <Card.Body
              ref={listRef}
              style={{
                overflowY: "auto",
                background: "linear-gradient(to bottom, #f8f9fa, #ffffff)",
                padding: "12px",
              }}
            >
              <ListGroup variant="flush">
                {messages.map((m) => (
                  <ListGroup.Item
                    key={m.id}
                    className={`border-0 ${
                      m.role === "user" ? "text-end" : ""
                    }`}
                    style={{ background: "transparent" }}
                  >
                    <div
                      style={{
                        display: "inline-block",
                        maxWidth: "75%",
                        textAlign: m.role === "user" ? "right" : "left",
                      }}
                    >
                      <div className="small text-muted mb-1">
                        {m.role === "user" ? (
                          <>
                            <FontAwesomeIcon icon={faUser} /> You
                          </>
                        ) : (
                          <>
                            <FontAwesomeIcon icon={faRobot} /> AI
                          </>
                        )}
                        <span className="ms-2">
                          {new Date(m.createdAt).toLocaleTimeString()}
                        </span>
                      </div>
                      <div
                        className={`p-2 rounded shadow-sm ${
                          m.role === "user"
                            ? "bg-primary text-white"
                            : "bg-light text-dark"
                        }`}
                        style={{ whiteSpace: "pre-wrap" }}
                      >
                        {m.role === "assistant" ? (
                          <ReactMarkdown remarkPlugins={[remarkGfm]}>
                            {m.text}
                          </ReactMarkdown>
                        ) : (
                          m.text
                        )}
                      </div>
                    </div>
                  </ListGroup.Item>
                ))}

                {/* Typing Indicator */}
                {isSending && (
                  <ListGroup.Item className="border-0">
                    <div className="typing-indicator">
                      <div className="typing-dot"></div>
                      <div className="typing-dot"></div>
                      <div className="typing-dot"></div>
                    </div>
                  </ListGroup.Item>
                )}
              </ListGroup>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Input Form */}
      <Row className="mt-3">
        <Col>
          <Form onSubmit={handleSend}>
            <InputGroup>
              <Form.Control
                placeholder="What do you want to ask..."
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
                    <Spinner animation="border" size="sm" /> Thinking
                  </>
                ) : (
                  <>
                    <FontAwesomeIcon icon={faPaperPlane} /> Send
                  </>
                )}
              </Button>
              <Button
                variant="danger"
                onClick={clearHistory}
                title="Clear history"
              >
                <FontAwesomeIcon icon={faTrash} />
              </Button>
            </InputGroup>
          </Form>
        </Col>
      </Row>
    </Container>
  );
}
