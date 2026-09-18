import Logo from "../components/Logo";

import {
  ArrowLeft,
  Check,
  CheckCheck,
  FileText,
  Menu,
  Paperclip,
  Send,
  Smile,
  Video,
} from "lucide-react";

import {
  useEffect,
  useRef,
  useState,
} from "react";

import {
  useNavigate,
  useSearchParams,
} from "react-router-dom";

import type { Socket } from "socket.io-client";

import { useAuth } from "../context/AuthContext";
import { apiRequest } from "../services/api";

import {
  connectSocket,
  disconnectSocket,
} from "../services/socket";


/* ============================================================
   TYPES
============================================================ */

interface ChatMessage {
  id: number;
  case_id: number;
  sender_id: number;
  receiver_id: number;

  message: string;

  attachment_url?: string | null;
  attachment_name?: string | null;
  attachment_type?: string | null;

  is_read: boolean;
  created_at: string;
}


interface CaseItem {
  id: number;
  title: string;

  client_id: number;
  lawyer_id?: number | null;

  status: string;
}


interface ChatHistoryResponse {
  messages: ChatMessage[];
  total: number;
  page: number;
  page_size: number;
}


/* ============================================================
   CHAT PAGE
============================================================ */

export default function ChatPage() {

  const navigate = useNavigate();

  const [searchParams] = useSearchParams();

  const { user, token } = useAuth();


  /* ==========================================================
     USER ROLE
  ========================================================== */

  const isLawyer =
    user?.role === "lawyer";

  const isClient =
    user?.role === "client";


  /* ==========================================================
     CASE ID FROM URL
  ========================================================== */

  const caseIdFromUrl =
    searchParams.get("case_id");


  /* ==========================================================
     STATE
  ========================================================== */

  const [cases, setCases] =
    useState<CaseItem[]>([]);

  const [selectedCase, setSelectedCase] =
    useState<CaseItem | null>(null);

  const [messages, setMessages] =
    useState<ChatMessage[]>([]);

  const [message, setMessage] =
    useState("");

  const [loadingCases, setLoadingCases] =
    useState(true);

  const [loadingMessages, setLoadingMessages] =
    useState(false);

  const [error, setError] =
    useState("");

  const [connected, setConnected] =
    useState(false);

  const [isTyping, setIsTyping] =
    useState(false);

  const [otherUserOnline, setOtherUserOnline] =
    useState(false);


  /* ==========================================================
     REFS
  ========================================================== */

  const socketRef =
    useRef<Socket | null>(null);

  const messagesEndRef =
    useRef<HTMLDivElement | null>(null);

  const typingTimeoutRef =
    useRef<ReturnType<typeof setTimeout> | null>(
      null
    );


  /* ==========================================================
     LOAD CASES
  ========================================================== */

  useEffect(() => {

    let mounted = true;


    const loadCases = async () => {

      if (!token || !user) {
        return;
      }


      try {

        setLoadingCases(true);
        setError("");


        /*
         * CLIENT:
         * GET /cases
         *
         * LAWYER:
         * GET /lawyer/cases
         */

        const endpoint =
          isLawyer
            ? "/lawyer/cases"
            : "/cases";


        const data =
          await apiRequest<CaseItem[]>(
            endpoint,
            {
              token,
            }
          );


        if (!mounted) {
          return;
        }


        if (!Array.isArray(data)) {

          setError(
            "Invalid cases response from server."
          );

          setCases([]);

          return;
        }


        setCases(data);


        /*
         * If case_id exists in URL,
         * select that case.
         */

        if (caseIdFromUrl) {

          const requestedCaseId =
            Number(caseIdFromUrl);


          const foundCase =
            data.find(
              (item) =>
                Number(item.id) ===
                requestedCaseId
            );


          if (foundCase) {

            setSelectedCase(
              foundCase
            );

          } else {

            setError(
              "The selected case was not found or you do not have access to it."
            );

          }

        } else if (data.length > 0) {

          /*
           * Otherwise select first case.
           */

          setSelectedCase(
            data[0]
          );

        }

      } catch (err) {

        if (!mounted) {
          return;
        }


        console.error(
          "Failed to load cases:",
          err
        );


        if (err instanceof Error) {

          setError(
            err.message
          );

        } else {

          setError(
            "Unable to load cases."
          );

        }

      } finally {

        if (mounted) {
          setLoadingCases(false);
        }

      }

    };


    void loadCases();


    return () => {

      mounted = false;

    };

  }, [
    token,
    user,
    isLawyer,
    caseIdFromUrl,
  ]);


  /* ==========================================================
     CONNECT SOCKET.IO
  ========================================================== */

  useEffect(() => {

    if (!token) {
      return;
    }


    const socket =
      connectSocket(token);


    socketRef.current =
      socket;


    const handleConnect =
      () => {

        console.log(
          "Socket connected:",
          socket.id
        );

        setConnected(true);

      };


    const handleDisconnect =
      () => {

        console.log(
          "Socket disconnected"
        );

        setConnected(false);

        setOtherUserOnline(false);

      };


    const handleConnectError =
      (err: Error) => {

        console.error(
          "Socket connection error:",
          err.message
        );

        setConnected(false);

      };


    const handleSocketError =
      (data: {
        message?: string;
      }) => {

        console.error(
          "Socket error:",
          data?.message || data
        );


        if (data?.message) {

          setError(
            data.message
          );

        }

      };


    socket.on(
      "connect",
      handleConnect
    );


    socket.on(
      "disconnect",
      handleDisconnect
    );


    socket.on(
      "connect_error",
      handleConnectError
    );


    socket.on(
      "error",
      handleSocketError
    );


    return () => {

      socket.off(
        "connect",
        handleConnect
      );


      socket.off(
        "disconnect",
        handleDisconnect
      );


      socket.off(
        "connect_error",
        handleConnectError
      );


      socket.off(
        "error",
        handleSocketError
      );


      if (
        typingTimeoutRef.current
      ) {

        clearTimeout(
          typingTimeoutRef.current
        );

        typingTimeoutRef.current =
          null;

      }


      disconnectSocket();

      socketRef.current =
        null;

    };

  }, [token]);


  /* ==========================================================
     LOAD CHAT HISTORY
  ========================================================== */

  useEffect(() => {

    let mounted = true;


    const loadMessages =
      async () => {

        if (
          !token ||
          !selectedCase
        ) {

          return;

        }


        try {

          setLoadingMessages(true);
          setError("");
          setIsTyping(false);


          const data =
            await apiRequest<ChatHistoryResponse>(
              `/chat/${selectedCase.id}`,
              {
                token,
              }
            );


          if (!mounted) {
            return;
          }


          setMessages(
            Array.isArray(data?.messages)
              ? data.messages
              : []
          );

        } catch (err) {

          if (!mounted) {
            return;
          }


          console.error(
            "Failed to load messages:",
            err
          );


          if (err instanceof Error) {

            setError(
              err.message
            );

          } else {

            setError(
              "Unable to load chat messages."
            );

          }

        } finally {

          if (mounted) {

            setLoadingMessages(
              false
            );

          }

        }

      };


    void loadMessages();


    return () => {

      mounted = false;

    };

  }, [
    token,
    selectedCase,
  ]);


  /* ==========================================================
     GET OTHER USER ID
  ========================================================== */

  const getOtherUserId =
    () => {

      if (!selectedCase) {
        return null;
      }


      /*
       * CLIENT talks to LAWYER
       */

      if (isClient) {

        return (
          selectedCase.lawyer_id ??
          null
        );

      }


      /*
       * LAWYER talks to CLIENT
       */

      if (isLawyer) {

        return (
          selectedCase.client_id
        );

      }


      return null;

    };


  /* ==========================================================
     JOIN CASE ROOM
  ========================================================== */

  useEffect(() => {

    const socket =
      socketRef.current;


    if (
      !socket ||
      !token ||
      !selectedCase ||
      !connected
    ) {

      return;

    }


    const caseId =
      selectedCase.id;


    const otherUserId =
      getOtherUserId();


    console.log(
      `Joining case_${caseId}`
    );


    socket.emit(
      "join_case",
      {
        token,
        case_id: caseId,
      }
    );


    /*
     * Check online status
     */

    if (
      otherUserId !== null
    ) {

      socket.emit(
        "user_status",
        {
          user_id:
            otherUserId,
        }
      );

    } else {

      setOtherUserOnline(
        false
      );

    }


    return () => {

      console.log(
        `Leaving case_${caseId}`
      );


      socket.emit(
        "leave_case",
        {
          token,
          case_id: caseId,
        }
      );


      setIsTyping(false);

      setOtherUserOnline(
        false
      );

    };

  }, [
    connected,
    token,
    selectedCase,
    isClient,
    isLawyer,
  ]);


  /* ==========================================================
     SOCKET EVENTS
  ========================================================== */

  useEffect(() => {

    const socket =
      socketRef.current;


    if (!socket) {
      return;
    }


    /* --------------------------------------------------------
       NEW MESSAGE
    -------------------------------------------------------- */

    const handleNewMessage =
      (
        newMessage: ChatMessage
      ) => {

        if (
          selectedCase &&
          newMessage.case_id !==
            selectedCase.id
        ) {

          return;

        }


        setMessages(
          (previous) => {

            const exists =
              previous.some(
                (item) =>
                  item.id ===
                  newMessage.id
              );


            if (exists) {

              return previous;

            }


            return [
              ...previous,
              newMessage,
            ];

          }
        );

      };


    /* --------------------------------------------------------
       MESSAGE SENT
    -------------------------------------------------------- */

    const handleMessageSent =
      (
        sentMessage: ChatMessage
      ) => {

        if (
          selectedCase &&
          sentMessage.case_id !==
            selectedCase.id
        ) {

          return;

        }


        setMessages(
          (previous) => {

            const exists =
              previous.some(
                (item) =>
                  item.id ===
                  sentMessage.id
              );


            if (exists) {

              return previous;

            }


            return [
              ...previous,
              sentMessage,
            ];

          }
        );

      };


    /* --------------------------------------------------------
       USER TYPING
    -------------------------------------------------------- */

    const handleTyping =
      (
        data: {
          user_id?: number;
        }
      ) => {

        if (
          data?.user_id ===
          undefined
        ) {

          return;

        }


        if (
          data.user_id !==
          user?.id
        ) {

          setIsTyping(true);

        }

      };


    /* --------------------------------------------------------
       USER STOP TYPING
    -------------------------------------------------------- */

    const handleStopTyping =
      (
        data: {
          user_id?: number;
        }
      ) => {

        if (
          data?.user_id ===
          undefined
        ) {

          return;

        }


        if (
          data.user_id !==
          user?.id
        ) {

          setIsTyping(false);

        }

      };


    /* --------------------------------------------------------
       MESSAGE READ
    -------------------------------------------------------- */

    const handleMessageRead =
      (
        data: {
          message_id?: number;
          is_read?: boolean;
        }
      ) => {

        if (
          data?.message_id ===
          undefined
        ) {

          return;

        }


        setMessages(
          (previous) =>

            previous.map(
              (item) =>

                item.id ===
                data.message_id

                  ? {
                      ...item,
                      is_read:
                        data.is_read ??
                        true,
                    }

                  : item
            )

        );

      };


    /* --------------------------------------------------------
       USER STATUS
    -------------------------------------------------------- */

    const handleStatus =
      (
        data: {
          user_id?: number;
          online?: boolean;
        }
      ) => {

        if (
          data?.user_id ===
          undefined
        ) {

          return;

        }


        const otherUserId =
          selectedCase
            ? isClient
              ? selectedCase.lawyer_id
              : selectedCase.client_id
            : null;


        if (
          otherUserId !== null &&
          otherUserId !== undefined &&
          Number(data.user_id) ===
            Number(otherUserId)
        ) {

          setOtherUserOnline(
            data.online === true
          );

        }

      };


    /* --------------------------------------------------------
       REGISTER
    -------------------------------------------------------- */

    socket.on(
      "new_message",
      handleNewMessage
    );


    socket.on(
      "message_sent",
      handleMessageSent
    );


    socket.on(
      "user_typing",
      handleTyping
    );


    socket.on(
      "user_stop_typing",
      handleStopTyping
    );


    socket.on(
      "message_read",
      handleMessageRead
    );


    socket.on(
      "status",
      handleStatus
    );


    /* --------------------------------------------------------
       CLEANUP
    -------------------------------------------------------- */

    return () => {

      socket.off(
        "new_message",
        handleNewMessage
      );


      socket.off(
        "message_sent",
        handleMessageSent
      );


      socket.off(
        "user_typing",
        handleTyping
      );


      socket.off(
        "user_stop_typing",
        handleStopTyping
      );


      socket.off(
        "message_read",
        handleMessageRead
      );


      socket.off(
        "status",
        handleStatus
      );

    };

  }, [
    selectedCase,
    user?.id,
    isClient,
    isLawyer,
  ]);


  /* ==========================================================
     AUTO SCROLL
  ========================================================== */

  useEffect(() => {

    messagesEndRef.current?.scrollIntoView(
      {
        behavior: "smooth",
      }
    );

  }, [messages]);


  /* ==========================================================
     SEND MESSAGE
  ========================================================== */

  const sendMessage =
    () => {

      const trimmedMessage =
        message.trim();


      if (
        !trimmedMessage ||
        !selectedCase ||
        !token ||
        !user
      ) {

        return;

      }


      const receiverId =
        getOtherUserId();


      if (
        receiverId ===
        null ||
        receiverId ===
        undefined
      ) {

        setError(
          isClient
            ? "This case does not have a lawyer assigned yet."
            : "This case does not have a client assigned."
        );

        return;

      }


      /*
       * Cannot message yourself.
       */

      if (
        Number(receiverId) ===
        Number(user.id)
      ) {

        setError(
          "You cannot send a message to yourself."
        );

        return;

      }


      const socket =
        socketRef.current;


      /* --------------------------------------------------------
         SOCKET.IO
      -------------------------------------------------------- */

      if (
        socket &&
        socket.connected
      ) {

        socket.emit(
          "send_message",
          {
            token,

            case_id:
              selectedCase.id,

            receiver_id:
              receiverId,

            message:
              trimmedMessage,
          }
        );


        setMessage("");


        socket.emit(
          "stop_typing",
          {
            token,
            case_id:
              selectedCase.id,

            user_id:
              user.id,
          }
        );


        setIsTyping(false);


        if (
          typingTimeoutRef.current
        ) {

          clearTimeout(
            typingTimeoutRef.current
          );

          typingTimeoutRef.current =
            null;

        }


        return;

      }


      /*
       * REST FALLBACK
       */

      void sendMessageRest(
        trimmedMessage,
        receiverId
      );

    };


  /* ==========================================================
     REST SEND MESSAGE
  ========================================================== */

  const sendMessageRest =
    async (
      text: string,
      receiverId: number
    ) => {

      if (
        !token ||
        !selectedCase
      ) {

        return;

      }


      try {

        const newMessage =
          await apiRequest<ChatMessage>(
            "/chat/send",
            {
              method: "POST",

              token,

              body: {
                case_id:
                  selectedCase.id,

                receiver_id:
                  receiverId,

                message:
                  text,
              },
            }
          );


        setMessages(
          (previous) => {

            const exists =
              previous.some(
                (item) =>
                  item.id ===
                  newMessage.id
              );


            if (exists) {

              return previous;

            }


            return [
              ...previous,
              newMessage,
            ];

          }
        );


        setMessage("");

      } catch (err) {

        console.error(
          "REST send failed:",
          err
        );


        if (
          err instanceof Error
        ) {

          setError(
            err.message
          );

        } else {

          setError(
            "Unable to send message."
          );

        }

      }

    };


  /* ==========================================================
     TYPING
  ========================================================== */

  const handleTyping =
    (
      value: string
    ) => {

      setMessage(value);


      if (
        !selectedCase ||
        !user
      ) {

        return;

      }


      const socket =
        socketRef.current;


      if (
        !socket ||
        !socket.connected
      ) {

        return;

      }


      socket.emit(
        "typing",
        {
          token,
          case_id:
            selectedCase.id,

          user_id:
            user.id,
        }
      );


      if (
        typingTimeoutRef.current
      ) {

        clearTimeout(
          typingTimeoutRef.current
        );

      }


      typingTimeoutRef.current =
        setTimeout(
          () => {

            socketRef.current?.emit(
              "stop_typing",
              {
                token,
                case_id:
                  selectedCase.id,

                user_id:
                  user.id,
              }
            );


            setIsTyping(false);


            typingTimeoutRef.current =
              null;

          },
          1000
        );

    };


  /* ==========================================================
     MARK READ
  ========================================================== */

  const markMessageRead =
    (
      messageId: number
    ) => {

      const socket =
        socketRef.current;


      if (
        !socket ||
        !socket.connected
      ) {

        return;

      }


      socket.emit(
        "mark_read",
        {
          token,
          message_id:
            messageId,
        }
      );

    };


  /* ==========================================================
     FORMAT TIME
  ========================================================== */

  const formatTime =
    (
      value: string
    ) => {

      const date =
        new Date(value);


      if (
        Number.isNaN(
          date.getTime()
        )
      ) {

        return "";

      }


      return date.toLocaleTimeString(
        "en-IN",
        {
          hour: "numeric",
          minute: "2-digit",
          hour12: true,
        }
      );

    };


  /* ==========================================================
     SELECT CASE
  ========================================================== */

  const selectCase =
    (
      caseItem: CaseItem
    ) => {

      if (
        typingTimeoutRef.current
      ) {

        clearTimeout(
          typingTimeoutRef.current
        );

        typingTimeoutRef.current =
          null;

      }


      setSelectedCase(
        caseItem
      );

      setMessages([]);

      setIsTyping(false);

      setOtherUserOnline(
        false
      );

      setError("");

      setMessage("");


      /*
       * Update URL.
       */

      navigate(
        `${
          isLawyer
            ? "/lawyer/messages"
            : "/client/messages"
        }?case_id=${caseItem.id}`,
        {
          replace: true,
        }
      );

    };


  /* ==========================================================
     BACK TO DASHBOARD
  ========================================================== */

  const goBack =
    () => {

      if (isLawyer) {

        navigate(
          "/lawyer/dashboard"
        );

      } else {

        navigate(
          "/client/dashboard"
        );

      }

    };


  /* ==========================================================
     DISPLAY ROLE
  ========================================================== */

  const otherPersonLabel =
    isLawyer
      ? "Client"
      : "Lawyer";


  const onlineLabel =
    !getOtherUserId()
      ? `No ${otherPersonLabel.toLowerCase()} assigned`
      : otherUserOnline
        ? `${otherPersonLabel} online`
        : `${otherPersonLabel} offline`;


  /* ==========================================================
     RENDER
  ========================================================== */

  return (

    <main className="flex h-screen bg-[#F4F0E8] text-[#171717]">


      {/* ======================================================
          SIDEBAR
      ====================================================== */}

      <aside className="hidden w-80 shrink-0 flex-col border-r border-[#D7CFBF] bg-[#FBF9F4] lg:flex">


        {/* LOGO */}

        <div className="border-b border-[#D7CFBF] px-6 py-5">

          <Logo />

        </div>


        {/* HEADER */}

        <div className="border-b border-[#D7CFBF] px-6 py-5">

          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#8A6D1D]">

            Messages

          </p>


          <h1 className="mt-1 font-serif text-xl font-semibold">

            {isLawyer
              ? "Client Conversations"
              : "Your Conversations"}

          </h1>

        </div>


        {/* CASE LIST */}

        <div className="flex-1 overflow-y-auto">

          {loadingCases && (

            <div className="px-6 py-10 text-center text-sm text-[#77716A]">

              Loading cases...

            </div>

          )}


          {!loadingCases &&
            cases.length === 0 && (

              <div className="px-6 py-10 text-center">

                <GavelIcon />

                <p className="mt-4 text-sm font-semibold">

                  No cases

                </p>

                <p className="mt-1 text-xs text-[#77716A]">

                  No assigned conversations found.

                </p>

              </div>

            )}


          {cases.map(
            (caseItem) => {

              const active =
                selectedCase?.id ===
                caseItem.id;


              const hasOtherUser =
                isLawyer
                  ? true
                  : caseItem.lawyer_id !==
                    null &&
                    caseItem.lawyer_id !==
                    undefined;


              return (

                <button
                  key={caseItem.id}
                  type="button"
                  onClick={() =>
                    selectCase(
                      caseItem
                    )
                  }
                  className={`w-full border-b border-[#E1DBD0] px-6 py-5 text-left transition ${
                    active
                      ? "bg-[#F1ECE2]"
                      : "hover:bg-[#F5F1E8]"
                  }`}
                >

                  <div className="flex items-start gap-3">

                    <div className="flex h-10 w-10 shrink-0 items-center justify-center bg-[#171717] font-serif text-sm font-semibold text-[#C9A227]">

                      {caseItem.id}

                    </div>


                    <div className="min-w-0">

                      <p className="truncate font-serif text-base font-semibold">

                        {caseItem.title}

                      </p>


                      <p className="mt-1 text-xs text-[#77716A]">

                        Case #{caseItem.id}

                      </p>


                      <div className="mt-2 flex items-center gap-2">

                        <span className="text-[10px] font-semibold uppercase tracking-wider text-[#8A6D1D]">

                          {caseItem.status.replace(
                            /_/g,
                            " "
                          )}

                        </span>


                        {hasOtherUser && (

                          <span className="text-[10px] text-green-700">

                            {isLawyer
                              ? "Client assigned"
                              : "Lawyer assigned"}

                          </span>

                        )}

                      </div>

                    </div>

                  </div>

                </button>

              );

            }
          )}

        </div>


        {/* BACK */}

        <div className="border-t border-[#D7CFBF] p-4">

          <button
            type="button"
            onClick={
              goBack
            }
            className="flex w-full items-center gap-3 px-3 py-3 text-sm text-[#55504A] hover:bg-[#F0EBE1]"
          >

            <ArrowLeft
              size={18}
            />

            Back to Dashboard

          </button>

        </div>

      </aside>


      {/* ======================================================
          CHAT
      ====================================================== */}

      <section className="flex min-w-0 flex-1 flex-col">


        {/* ====================================================
            HEADER
        ==================================================== */}

        <header className="flex h-20 shrink-0 items-center justify-between border-b border-[#D7CFBF] bg-[#FBF9F4] px-5 md:px-8">

          <div className="flex min-w-0 items-center gap-3">


            <button
              type="button"
              onClick={
                goBack
              }
              className="rounded p-2 hover:bg-[#F0EBE1]"
            >

              <ArrowLeft
                size={20}
              />

            </button>


            <div className="min-w-0">

              <p className="truncate font-serif text-lg font-semibold">

                {selectedCase?.title ??
                  "Select a case"}

              </p>


              {selectedCase && (

                <div className="flex items-center gap-2 text-xs text-[#77716A]">

                  <span
                    className={`h-2 w-2 rounded-full ${
                      !getOtherUserId()
                        ? "bg-[#C5BFB4]"
                        : otherUserOnline
                          ? "bg-green-500"
                          : "bg-[#A39B8E]"
                    }`}
                  />


                  <span>

                    {onlineLabel}

                  </span>


                  {getOtherUserId() &&
                    !connected && (

                      <>

                        <span>
                          ·
                        </span>

                        <span>
                          Connecting...
                        </span>

                      </>

                    )}

                </div>

              )}

            </div>

          </div>


          <div className="flex items-center gap-2">

            <button
              type="button"
              className="rounded-full p-2.5 text-[#55504A] hover:bg-[#F0EBE1]"
              title="Video call"
            >

              <Video
                size={19}
              />

            </button>


            <button
              type="button"
              className="rounded-full p-2.5 text-[#55504A] hover:bg-[#F0EBE1]"
              title="More options"
            >

              <Menu
                size={20}
              />

            </button>

          </div>

        </header>


        {/* ====================================================
            ERROR
        ==================================================== */}

        {error && (

          <div className="border-b border-red-200 bg-red-50 px-5 py-3 text-sm text-red-700 md:px-8">

            {error}


            <button
              type="button"
              onClick={() =>
                setError("")
              }
              className="ml-3 underline"
            >

              Dismiss

            </button>

          </div>

        )}


        {/* ====================================================
            MESSAGES
        ==================================================== */}

        <div className="flex-1 overflow-y-auto px-5 py-6 md:px-8">

          <div className="mx-auto max-w-4xl">


            {!selectedCase && (

              <div className="flex min-h-[500px] items-center justify-center text-center">

                <div>

                  <MessageIcon />

                  <h2 className="mt-5 font-serif text-xl font-semibold">

                    Select a case

                  </h2>


                  <p className="mt-2 text-sm text-[#77716A]">

                    Choose a case to start your conversation.

                  </p>

                </div>

              </div>

            )}


            {selectedCase &&
              loadingMessages && (

                <div className="flex min-h-[400px] items-center justify-center text-sm text-[#77716A]">

                  Loading conversation...

                </div>

              )}


            {selectedCase &&
              !loadingMessages &&
              messages.length === 0 && (

                <div className="flex min-h-[400px] items-center justify-center text-center">

                  <div>

                    <MessageIcon />

                    <h2 className="mt-5 font-serif text-xl font-semibold">

                      Start the conversation

                    </h2>


                    <p className="mt-2 text-sm text-[#77716A]">

                      {getOtherUserId()
                        ? isLawyer
                          ? "Send a message to the client assigned to this case."
                          : "Send a message to your assigned lawyer."
                        : isLawyer
                          ? "A client is not assigned to this case."
                          : "A lawyer has not been assigned to this case yet."}

                    </p>

                  </div>

                </div>

              )}


            {selectedCase &&
              !loadingMessages &&
              messages.length > 0 && (

                <div className="space-y-5">

                  {messages.map(
                    (item) => {

                      const mine =
                        Number(
                          item.sender_id
                        ) ===
                        Number(
                          user?.id
                        );


                      /*
                       * Mark incoming messages as read.
                       */

                      if (
                        !mine &&
                        !item.is_read
                      ) {

                        markMessageRead(
                          item.id
                        );

                      }


                      return (

                        <div
                          key={item.id}
                          className={`flex ${
                            mine
                              ? "justify-end"
                              : "justify-start"
                          }`}
                        >

                          <div
                            className={`max-w-[80%] md:max-w-[65%] ${
                              mine
                                ? "items-end"
                                : "items-start"
                            }`}
                          >

                            <div
                              className={`px-4 py-3 ${
                                mine
                                  ? "bg-[#171717] text-white"
                                  : "border border-[#D7CFBF] bg-[#FBF9F4]"
                              }`}
                            >

                              {item.message && (

                                <p className="whitespace-pre-wrap text-sm leading-6">

                                  {item.message}

                                </p>

                              )}


                              {item.attachment_name && (

                                <div className="mt-3 flex items-center gap-3 border-t border-white/20 pt-3">

                                  <FileText
                                    size={16}
                                  />

                                  <span className="text-xs">

                                    {
                                      item.attachment_name
                                    }

                                  </span>

                                </div>

                              )}

                            </div>


                            <div
                              className={`mt-1.5 flex items-center gap-1.5 text-[10px] text-[#77716A] ${
                                mine
                                  ? "justify-end"
                                  : "justify-start"
                              }`}
                            >

                              <span>

                                {formatTime(
                                  item.created_at
                                )}

                              </span>


                              {mine &&
                                (
                                  item.is_read
                                    ? (
                                      <CheckCheck
                                        size={13}
                                      />
                                    )
                                    : (
                                      <Check
                                        size={13}
                                      />
                                    )
                                )}

                            </div>

                          </div>

                        </div>

                      );

                    }
                  )}

                </div>

              )}


            {isTyping && (

              <div className="mt-5 flex items-center gap-2 text-xs text-[#77716A]">

                <span className="flex gap-1">

                  <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-[#8A6D1D]" />

                  <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-[#8A6D1D] [animation-delay:100ms]" />

                  <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-[#8A6D1D] [animation-delay:200ms]" />

                </span>


                {isLawyer
                  ? "Client is typing..."
                  : "Lawyer is typing..."}

              </div>

            )}


            <div
              ref={
                messagesEndRef
              }
            />

          </div>

        </div>


        {/* ====================================================
            INPUT
        ==================================================== */}

        <footer className="border-t border-[#D7CFBF] bg-[#FBF9F4] px-5 py-4 md:px-8">

          <div className="mx-auto max-w-4xl">


            {selectedCase &&
              !getOtherUserId() && (

                <div className="mb-3 border border-[#D7CFBF] bg-[#F1ECE2] px-4 py-3 text-xs text-[#77716A]">

                  {isLawyer
                    ? "A client has not been assigned to this case yet."
                    : "A lawyer has not been assigned to this case yet."}

                </div>

              )}


            <div className="flex items-end gap-2 border border-[#CEC6B8] bg-white p-2 focus-within:border-[#C9A227]">


              <button
                type="button"
                disabled={
                  !getOtherUserId()
                }
                className="shrink-0 rounded p-2 text-[#77716A] hover:bg-[#F1ECE2] disabled:cursor-not-allowed disabled:opacity-40"
                title="Attach file"
              >

                <Paperclip
                  size={19}
                />

              </button>


              <textarea
                value={message}
                onChange={(event) =>
                  handleTyping(
                    event.target.value
                  )
                }
                onKeyDown={(event) => {

                  if (
                    event.key ===
                      "Enter" &&
                    !event.shiftKey
                  ) {

                    event.preventDefault();

                    sendMessage();

                  }

                }}
                disabled={
                  !selectedCase ||
                  !getOtherUserId()
                }
                rows={1}
                placeholder={
                  !selectedCase
                    ? "Select a case..."
                    : !getOtherUserId()
                      ? isLawyer
                        ? "Waiting for client assignment..."
                        : "Waiting for lawyer assignment..."
                      : "Write a message..."
                }
                className="max-h-32 min-h-[40px] flex-1 resize-none border-0 bg-transparent px-2 py-2 text-sm outline-none placeholder:text-[#A39B8E] disabled:cursor-not-allowed"
              />


              <button
                type="button"
                disabled={
                  !getOtherUserId()
                }
                className="hidden shrink-0 rounded p-2 text-[#77716A] hover:bg-[#F1ECE2] disabled:opacity-40 sm:block"
                title="Emoji"
              >

                <Smile
                  size={19}
                />

              </button>


              <button
                type="button"
                onClick={
                  sendMessage
                }
                disabled={
                  !message.trim() ||
                  !selectedCase ||
                  !getOtherUserId()
                }
                className="flex h-10 w-10 shrink-0 items-center justify-center bg-[#171717] text-white transition hover:bg-[#2A2A2A] disabled:cursor-not-allowed disabled:opacity-40"
                title="Send message"
              >

                <Send
                  size={17}
                />

              </button>

            </div>


            <p className="mt-2 hidden text-[10px] text-[#8A847B] sm:block">

              Press Enter to send · Shift + Enter for a new line

            </p>

          </div>

        </footer>

      </section>

    </main>

  );
}


/* ============================================================
   MESSAGE ICON
============================================================ */

function MessageIcon() {

  return (

    <div className="mx-auto flex h-14 w-14 items-center justify-center border border-[#D7CFBF] bg-[#F1ECE2]">

      <svg
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
      >

        <path
          d="M21 11.5a8.38 8.38 0 0 1-.9 3.8
          8.5 8.5 0 0 1-7.6 4.7
          8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7
          A8.38 8.38 0 0 1 4 11.5
          8.5 8.5 0 0 1 8.7 3.9
          8.38 8.38 0 0 1 12.5 3
          h.5a8.48 8.48 0 0 1 8 8v.5Z"
        />

      </svg>

    </div>

  );

}


/* ============================================================
   GAVEL ICON
============================================================ */

function GavelIcon() {

  return (

    <div className="mx-auto flex h-10 w-10 items-center justify-center border border-[#D7CFBF] bg-[#F1ECE2]">

      <span className="font-serif text-sm font-semibold text-[#8A6D1D]">

        —

      </span>

    </div>

  );

}