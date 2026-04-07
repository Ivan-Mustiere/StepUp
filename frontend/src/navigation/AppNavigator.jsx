import { useEffect, useRef, useState } from "react";
import HomeScreen from "../screens/HomeScreen";
import DetailScreen from "../screens/DetailScreen";
import Card from "../components/Card";
import Button from "../components/Button";
import { formatDate, statutLabel, statutColor } from "../utils/helpers";
import {
  getFriends,
  getFriendRequestsIncoming,
  acceptFriendRequest,
  rejectFriendRequest,
  sendFriendRequest,
  getUserProfile,
  getParis,
  placeBet,
  getCommunautes,
  joinCommunaute,
  leaveCommunaute,
  getClassement,
  getMessages,
  sendMessage,
  getConversation,
  sendPrivateMessage,
} from "../api/api";

const TABS = [
  { id: "pronostics", label: "Pronostics" },
  { id: "paris", label: "Paris" },
  { id: "communautes", label: "Commu" },
  { id: "amis", label: "Amis" },
  { id: "profil", label: "👤" },
];

export default function AppNavigator({ profile, onLogout, onRefreshProfile }) {
  const [tab, setTab] = useState("pronostics");
  const [selectedPronostic, setSelectedPronostic] = useState(null);
  const [currentProfile, setCurrentProfile] = useState(profile);

  useEffect(() => {
    setCurrentProfile(profile);
  }, [profile]);

  async function handleRefresh() {
    await onRefreshProfile();
  }

  function renderContent() {
    if (selectedPronostic) {
      return (
        <DetailScreen
          pronostic={selectedPronostic}
          onBack={() => setSelectedPronostic(null)}
        />
      );
    }
    switch (tab) {
      case "pronostics":
        return <HomeScreen onSelect={setSelectedPronostic} />;
      case "paris":
        return <ParisScreen profile={currentProfile} onBetPlaced={handleRefresh} />;
      case "communautes":
        return <CommunautesScreen profile={currentProfile} />;
      case "amis":
        return <AmisScreen currentUser={currentProfile} />;
      case "profil":
        return <ProfilScreen profile={currentProfile} onLogout={onLogout} />;
      default:
        return null;
    }
  }

  return (
    <div className="app-layout">
      <header className="app-header">
        <span className="header-stat">🪙 {currentProfile.coins}</span>
        <span className="header-brand">StepUp</span>
        <span className="header-stat">⭐ {currentProfile.xp_total}</span>
      </header>
      <nav className="tab-bar">
        {TABS.map((t) => (
          <button
            key={t.id}
            className={`tab-btn ${tab === t.id && !selectedPronostic ? "active" : ""}`}
            onClick={() => {
              setTab(t.id);
              setSelectedPronostic(null);
            }}
          >
            {t.label}
          </button>
        ))}
      </nav>
      <main className="app-content">{renderContent()}</main>
    </div>
  );
}

// --- Écran Paris ---
const STATUTS_PARIS = ["", "actif", "ferme", "regle"];
const LIMIT = 20;

function ParisScreen({ profile, onBetPlaced }) {
  const [paris, setParis] = useState([]);
  const [statut, setStatut] = useState("actif");
  const [loading, setLoading] = useState(false);
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState("");
  const [bettingId, setBettingId] = useState(null);
  const [mise, setMise] = useState("");
  const [betError, setBetError] = useState("");
  const [betSuccess, setBetSuccess] = useState(null);

  async function load(reset = false) {
    setLoading(true);
    setError("");
    const currentOffset = reset ? 0 : offset;
    try {
      const params = new URLSearchParams({ limit: LIMIT, offset: currentOffset });
      if (statut) params.set("statut", statut);
      const data = await getParis(params.toString());
      if (reset) {
        setParis(data);
        setOffset(data.length);
      } else {
        setParis((prev) => [...prev, ...data]);
        setOffset((prev) => prev + data.length);
      }
      setHasMore(data.length === LIMIT);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load(true);
  }, [statut]);

  async function handleBet(e, pariId) {
    e.preventDefault();
    setBetError("");
    setBetSuccess(null);
    try {
      const result = await placeBet(pariId, Number(mise));
      setBetSuccess(result);
      setMise("");
      setBettingId(null);
      onBetPlaced();
    } catch (err) {
      setBetError(err.message);
    }
  }

  function openBet(pariId) {
    setBettingId(pariId);
    setMise("");
    setBetError("");
    setBetSuccess(null);
  }

  return (
    <div className="screen">
      <div className="screen-header">
        <h2>Paris</h2>
        <span className="coins-badge">🪙 {profile.coins}</span>
      </div>

      {betSuccess && (
        <div className="bet-success">
          ✓ Mise de {betSuccess.mise} coins placée — il vous reste {betSuccess.coins_restants} coins
        </div>
      )}

      <div className="filter-bar">
        {STATUTS_PARIS.map((s) => (
          <button
            key={s}
            className={`filter-btn ${statut === s ? "active" : ""}`}
            onClick={() => setStatut(s)}
          >
            {s === "" ? "Tous" : s.charAt(0).toUpperCase() + s.slice(1)}
          </button>
        ))}
      </div>

      {error && <p className="error">{error}</p>}

      <div className="list">
        {paris.map((p) => (
          <Card key={p.id} className="pari-card">
            <div className="pronostic-header">
              <span className="pronostic-titre">{p.titre}</span>
              <span className="badge" style={{ background: p.statut === "actif" ? "#16a34a" : "#64748b" }}>
                {p.statut}
              </span>
            </div>
            <p className="pronostic-prediction">"{p.prediction}"</p>
            {p.description && <p className="pari-description">{p.description}</p>}
            <div className="pronostic-meta">
              {p.cote && <span>Cote : {p.cote}</span>}
              <span>Mise min : {p.mise_min} 🪙</span>
              <span>{formatDate(p.created_at)}</span>
            </div>

            {p.statut === "actif" && (
              bettingId === p.id ? (
                <form className="bet-form" onSubmit={(e) => handleBet(e, p.id)}>
                  {betError && <p className="error">{betError}</p>}
                  <input
                    type="number"
                    min={p.mise_min || 1}
                    max={profile.coins}
                    placeholder={`Mise (min ${p.mise_min || 1} coins)`}
                    value={mise}
                    onChange={(e) => setMise(e.target.value)}
                    required
                    autoFocus
                  />
                  <div className="actions">
                    <Button type="submit">Confirmer</Button>
                    <Button variant="secondary" onClick={() => setBettingId(null)}>Annuler</Button>
                  </div>
                </form>
              ) : (
                <div style={{ marginTop: 10 }}>
                  <Button onClick={() => openBet(p.id)}>Parier</Button>
                </div>
              )
            )}
          </Card>
        ))}
        {paris.length === 0 && !loading && (
          <p className="empty">Aucun pari disponible.</p>
        )}
      </div>

      {hasMore && (
        <div className="center-btn">
          <Button onClick={() => load(false)} disabled={loading} variant="secondary">
            {loading ? "Chargement..." : "Voir plus"}
          </Button>
        </div>
      )}
    </div>
  );
}

// --- Écran Communautés ---
function CommunautesScreen({ profile }) {
  const [communautes, setCommunautes] = useState([]);
  const [error, setError] = useState("");
  const [openChat, setOpenChat] = useState(null);
  const [openClassement, setOpenClassement] = useState(null);

  async function load() {
    try {
      const data = await getCommunautes();
      setCommunautes(data);
    } catch (err) {
      setError(err.message);
    }
  }

  useEffect(() => { load(); }, []);

  async function handleJoin(id) {
    try {
      await joinCommunaute(id);
      load();
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleLeave(id) {
    if (openChat?.id === id) setOpenChat(null);
    try {
      await leaveCommunaute(id);
      load();
    } catch (err) {
      setError(err.message);
    }
  }

  // Grouper par jeu
  const parJeu = communautes.reduce((acc, c) => {
    if (!acc[c.jeu]) acc[c.jeu] = [];
    acc[c.jeu].push(c);
    return acc;
  }, {});

  if (openChat) {
    return (
      <ChatScreen
        communaute={openChat}
        profile={profile}
        onBack={() => setOpenChat(null)}
      />
    );
  }

  if (openClassement) {
    return (
      <ClassementScreen
        communaute={openClassement}
        profile={profile}
        onBack={() => setOpenClassement(null)}
      />
    );
  }

  return (
    <div className="screen">
      <div className="screen-header">
        <h2>Communautés</h2>
      </div>
      {error && <p className="error">{error}</p>}

      {Object.entries(parJeu).map(([jeu, liste]) => (
        <div key={jeu} className="section">
          <h3 className="jeu-label">{jeu}</h3>
          {liste.map((c) => (
            <Card key={c.id} className="communaute-card">
              <div className="communaute-header">
                <span className="communaute-nom">{c.nom}</span>
                <span className="communaute-membres">{c.nb_membres} membre{c.nb_membres !== 1 ? "s" : ""}</span>
              </div>
              {c.description && <p className="communaute-desc">{c.description}</p>}
              <div className="communaute-actions">
                {c.est_membre ? (
                  <>
                    <Button onClick={() => setOpenChat(c)}>💬 Chat</Button>
                    <Button variant="secondary" onClick={() => setOpenClassement(c)}>🏆 Classement</Button>
                    <Button variant="secondary" onClick={() => handleLeave(c.id)}>Quitter</Button>
                  </>
                ) : (
                  <>
                    <Button onClick={() => handleJoin(c.id)}>Rejoindre</Button>
                    <Button variant="secondary" onClick={() => setOpenClassement(c)}>🏆 Classement</Button>
                  </>
                )}
              </div>
            </Card>
          ))}
        </div>
      ))}

      {communautes.length === 0 && <p className="empty">Aucune communauté disponible.</p>}
    </div>
  );
}

// --- Classement ---
function ClassementScreen({ communaute, profile, onBack }) {
  const [classement, setClassement] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [profileModal, setProfileModal] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        const data = await getClassement(communaute.id);
        setClassement(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    })();
  }, [communaute.id]);

  const MEDALS = ["🥇", "🥈", "🥉"];

  return (
    <div className="screen">
      {profileModal && <ProfileModal user={profileModal} currentUser={profile} onClose={() => setProfileModal(null)} />}
      <div className="screen-header">
        <Button onClick={onBack} variant="secondary">← Retour</Button>
        <div>
          <h2 style={{ margin: 0 }}>Classement</h2>
          <span className="jeu-tag">{communaute.nom}</span>
        </div>
      </div>

      {loading && <p className="empty">Chargement...</p>}
      {error && <p className="error">{error}</p>}

      <div className="list">
        {classement.map((u) => {
          const isMe = u.pseudo === profile.pseudo;
          return (
            <Card
              key={u.id}
              className={`classement-item ${isMe ? "classement-me" : "clickable"}`}
              onClick={() => !isMe && setProfileModal(u)}
            >
              <span className="classement-rang">
                {u.rang <= 3 ? MEDALS[u.rang - 1] : `#${u.rang}`}
              </span>
              <div className="classement-info">
                <span className="classement-pseudo">
                  {u.pseudo} {isMe && <span className="me-tag">vous</span>}
                </span>
                <span className="classement-xp">{u.xp_total} XP</span>
              </div>
              <span className="classement-coins">🪙 {u.coins}</span>
            </Card>
          );
        })}
        {classement.length === 0 && !loading && (
          <p className="empty">Aucun membre dans cette communauté.</p>
        )}
      </div>
    </div>
  );
}

// --- Chat ---
function ChatScreen({ communaute, profile, onBack }) {
  const [messages, setMessages] = useState([]);
  const [texte, setTexte] = useState("");
  const [error, setError] = useState("");
  const [profileModal, setProfileModal] = useState(null);
  const bottomRef = useRef(null);
  const intervalRef = useRef(null);

  async function loadMessages() {
    try {
      const data = await getMessages(communaute.id);
      setMessages(data);
    } catch (err) {
      setError(err.message);
    }
  }

  useEffect(() => {
    loadMessages();
    intervalRef.current = setInterval(loadMessages, 3000);
    return () => clearInterval(intervalRef.current);
  }, [communaute.id]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function handleSend(e) {
    e.preventDefault();
    if (!texte.trim()) return;
    setError("");
    try {
      const msg = await sendMessage(communaute.id, texte.trim());
      setMessages((prev) => [...prev, msg]);
      setTexte("");
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleOpenProfile(pseudo) {
    // On cherche l'id depuis les messages (on prend la première occurrence)
    // L'API ne retourne pas l'id dans les messages, on doit chercher autrement.
    // On va stocker l'id dans les messages en enrichissant la réponse si possible,
    // mais pour l'instant on utilise une Map pseudo→id construite côté chat.
    const msg = messages.find((m) => m.pseudo === pseudo);
    if (!msg?.user_id) return;
    try {
      const user = await getUserProfile(msg.user_id);
      setProfileModal(user);
    } catch (_) {}
  }

  return (
    <div className="screen chat-screen">
      {profileModal && (
        <ProfileModal user={profileModal} currentUser={profile} onClose={() => setProfileModal(null)} />
      )}

      <div className="screen-header">
        <Button onClick={onBack} variant="secondary">← Retour</Button>
        <div>
          <h2 style={{ margin: 0 }}>{communaute.nom}</h2>
          <span className="jeu-tag">{communaute.jeu}</span>
        </div>
      </div>

      <div className="chat-messages">
        {messages.length === 0 && (
          <p className="empty">Aucun message. Soyez le premier !</p>
        )}
        {messages.map((m) => {
          const isMine = m.pseudo === profile.pseudo;
          return (
            <div key={m.id} className={`chat-bubble-row ${isMine ? "mine" : "other"}`}>
              {!isMine && (
                <span
                  className="bubble-author clickable"
                  onClick={() => handleOpenProfile(m.pseudo)}
                >
                  {m.pseudo}
                </span>
              )}
              <div className={`chat-bubble ${isMine ? "mine" : "other"}`}>
                {m.contenu}
              </div>
              <span className="bubble-time">
                {new Date(m.created_at).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
              </span>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {error && <p className="error" style={{ padding: "0 16px" }}>{error}</p>}

      <form className="chat-input-bar" onSubmit={handleSend}>
        <input
          placeholder="Votre message..."
          value={texte}
          onChange={(e) => setTexte(e.target.value)}
          maxLength={500}
          autoFocus
        />
        <Button type="submit" disabled={!texte.trim()}>Envoyer</Button>
      </form>
    </div>
  );
}

// --- Modal profil ---
function ProfileModal({ user, currentUser, onClose }) {
  const [requestState, setRequestState] = useState("idle"); // idle | sent | error
  const [errorMsg, setErrorMsg] = useState("");
  const isSelf = currentUser?.id === user.id;

  async function handleAskFriend() {
    setRequestState("loading");
    setErrorMsg("");
    try {
      await sendFriendRequest(user.id);
      setRequestState("sent");
    } catch (err) {
      setErrorMsg(err.message);
      setRequestState("error");
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose}>✕</button>
        <div className="profil-info" style={{ paddingBottom: 12, marginBottom: 12, borderBottom: "1px solid #f1f5f9" }}>
          <div className="profil-avatar">{user.pseudo?.[0]?.toUpperCase()}</div>
          <h3 style={{ margin: "8px 0 6px" }}>{user.pseudo}</h3>
          {!isSelf && (
            <div>
              {requestState === "sent" ? (
                <span className="sent-label">Demande envoyée ✓</span>
              ) : (
                <Button onClick={handleAskFriend} disabled={requestState === "loading"}>
                  {requestState === "loading" ? "..." : "Demander en ami"}
                </Button>
              )}
              {requestState === "error" && <p className="error" style={{ marginTop: 6 }}>{errorMsg}</p>}
            </div>
          )}
        </div>
        <div className="profil-stats" style={{ marginBottom: 12 }}>
          <div className="stat">
            <span className="stat-value">{user.coins}</span>
            <span className="stat-label">Coins</span>
          </div>
          <div className="stat">
            <span className="stat-value">{user.xp_total}</span>
            <span className="stat-label">XP</span>
          </div>
        </div>
        {user.communautes?.length > 0 && (
          <div>
            <p className="detail-label">Communautés</p>
            <div className="commu-tags">
              {user.communautes.map((c) => (
                <span key={c} className="commu-tag">{c}</span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// --- Écran Amis ---
function AmisScreen({ currentUser }) {
  const [friends, setFriends] = useState([]);
  const [incoming, setIncoming] = useState([]);
  const [friendId, setFriendId] = useState("");
  const [preview, setPreview] = useState(null);
  const [previewError, setPreviewError] = useState("");
  const [previewLoading, setPreviewLoading] = useState(false);
  const [requestSent, setRequestSent] = useState(false);
  const [error, setError] = useState("");
  const [profileModal, setProfileModal] = useState(null);
  const [openPrivateChat, setOpenPrivateChat] = useState(null);

  async function loadData() {
    try {
      const [friendsList, requests] = await Promise.all([
        getFriends(),
        getFriendRequestsIncoming(),
      ]);
      setFriends(friendsList);
      setIncoming(requests.filter((r) => r.status === "pending"));
    } catch (err) {
      setError(err.message);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  async function handleSearch(e) {
    e.preventDefault();
    setPreviewError("");
    setPreview(null);
    setRequestSent(false);
    setPreviewLoading(true);
    try {
      const user = await getUserProfile(Number(friendId));
      setPreview(user);
    } catch (err) {
      setPreviewError(err.message);
    } finally {
      setPreviewLoading(false);
    }
  }

  async function handleSendRequest() {
    try {
      await sendFriendRequest(preview.id);
      setRequestSent(true);
    } catch (err) {
      setPreviewError(err.message);
    }
  }

  async function handleAccept(requestId) {
    try {
      await acceptFriendRequest(requestId);
      loadData();
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleReject(requestId) {
    try {
      await rejectFriendRequest(requestId);
      loadData();
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div className="screen">
      {openPrivateChat && (
        <PrivateChatScreen
          friend={openPrivateChat}
          currentUser={currentUser}
          onBack={() => setOpenPrivateChat(null)}
        />
      )}
      {!openPrivateChat && <>
      <div className="screen-header">
        <h2>Amis</h2>
      </div>

      <Card className="form-card">
        <h3>Ajouter un ami</h3>
        <form className="form form-row" onSubmit={handleSearch}>
          <input
            type="number"
            placeholder="ID utilisateur"
            value={friendId}
            onChange={(e) => {
              setFriendId(e.target.value);
              setPreview(null);
              setRequestSent(false);
              setPreviewError("");
            }}
            required
          />
          <Button type="submit" disabled={previewLoading}>
            {previewLoading ? "..." : "Rechercher"}
          </Button>
        </form>

        {previewError && <p className="error" style={{ marginTop: 8 }}>{previewError}</p>}

        {preview && (
          <div className="user-preview">
            <div className="user-preview-avatar">
              {preview.pseudo?.[0]?.toUpperCase()}
            </div>
            <div className="user-preview-info">
              <span className="user-preview-pseudo">{preview.pseudo}</span>
              <span className="user-preview-meta">{preview.xp_total} XP · {preview.coins} coins</span>
            </div>
            <div className="user-preview-action">
              {requestSent ? (
                <span className="sent-label">Demande envoyée ✓</span>
              ) : (
                <Button onClick={handleSendRequest}>Demander en ami</Button>
              )}
            </div>
          </div>
        )}
      </Card>

      {incoming.length > 0 && (
        <div className="section">
          <h3>Demandes reçues ({incoming.length})</h3>
          {error && <p className="error">{error}</p>}
          {incoming.map((r) => (
            <Card key={r.request_id} className="friend-item">
              <span className="friend-pseudo">{r.sender_pseudo}</span>
              <div className="actions">
                <Button onClick={() => handleAccept(r.request_id)}>Accepter</Button>
                <Button onClick={() => handleReject(r.request_id)} variant="danger">
                  Refuser
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      <div className="section">
        <h3>Mes amis ({friends.length})</h3>
        {friends.length === 0 ? (
          <p className="empty">Aucun ami pour l'instant.</p>
        ) : (
          friends.map((f) => (
            <Card key={f.id} className="friend-item">
              <div className="friend-info clickable" onClick={() => setProfileModal(f)}>
                <span className="friend-pseudo">
                  {f.pseudo}
                  {f.communautes?.length > 0 && (
                    <span className="friend-commu"> — {f.communautes.slice(0, 2).join(", ")}{f.communautes.length > 2 ? "…" : ""}</span>
                  )}
                </span>
                <span className="friend-meta">{f.xp_total} XP · {f.coins} coins</span>
              </div>
              <Button onClick={() => setOpenPrivateChat(f)}>💬</Button>
            </Card>
          ))
        )}
        {profileModal && (
          <ProfileModal user={profileModal} currentUser={currentUser} onClose={() => setProfileModal(null)} />
        )}
      </div>
      </>}
    </div>
  );
}

// --- Chat privé ---
function PrivateChatScreen({ friend, currentUser, onBack }) {
  const [messages, setMessages] = useState([]);
  const [texte, setTexte] = useState("");
  const [error, setError] = useState("");
  const bottomRef = useRef(null);
  const intervalRef = useRef(null);

  async function loadMessages() {
    try {
      const data = await getConversation(friend.id);
      setMessages(data);
    } catch (err) {
      setError(err.message);
    }
  }

  useEffect(() => {
    loadMessages();
    intervalRef.current = setInterval(loadMessages, 3000);
    return () => clearInterval(intervalRef.current);
  }, [friend.id]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function handleSend(e) {
    e.preventDefault();
    if (!texte.trim()) return;
    setError("");
    try {
      const msg = await sendPrivateMessage(friend.id, texte.trim());
      setMessages((prev) => [...prev, msg]);
      setTexte("");
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div className="screen chat-screen">
      <div className="screen-header">
        <Button onClick={onBack} variant="secondary">← Retour</Button>
        <div className="chat-header-info">
          <div className="chat-avatar">{friend.pseudo?.[0]?.toUpperCase()}</div>
          <h2 style={{ margin: 0 }}>{friend.pseudo}</h2>
        </div>
      </div>

      <div className="chat-messages">
        {messages.length === 0 && (
          <p className="empty">Aucun message. Commencez la conversation !</p>
        )}
        {messages.map((m) => (
          <div key={m.id} className={`chat-bubble-row ${m.is_mine ? "mine" : "other"}`}>
            <div className={`chat-bubble ${m.is_mine ? "mine" : "other"}`}>
              {m.contenu}
            </div>
            <span className="bubble-time">
              {new Date(m.created_at).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
            </span>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {error && <p className="error" style={{ padding: "0 4px" }}>{error}</p>}

      <form className="chat-input-bar" onSubmit={handleSend}>
        <input
          placeholder={`Message à ${friend.pseudo}...`}
          value={texte}
          onChange={(e) => setTexte(e.target.value)}
          maxLength={1000}
          autoFocus
        />
        <Button type="submit" disabled={!texte.trim()}>Envoyer</Button>
      </form>
    </div>
  );
}

// --- Écran Profil ---
function ProfilScreen({ profile, onLogout }) {
  return (
    <div className="screen">
      <div className="screen-header">
        <h2>Mon profil</h2>
      </div>
      <Card>
        <div className="profil-info">
          <div className="profil-avatar">
            {profile.pseudo?.[0]?.toUpperCase()}
          </div>
          <h3 style={{ margin: "8px 0 4px" }}>{profile.pseudo}</h3>
          <p className="profil-email">{profile.email}</p>
          <p
            className="profil-id"
            title="Cliquer pour copier"
            onClick={() => navigator.clipboard.writeText(String(profile.id))}
          >
            ID : {profile.id} 📋
          </p>
        </div>
        <div className="profil-stats">
          <div className="stat">
            <span className="stat-value">{profile.coins}</span>
            <span className="stat-label">Coins</span>
          </div>
          <div className="stat">
            <span className="stat-value">{profile.xp_total}</span>
            <span className="stat-label">XP total</span>
          </div>
          {profile.rank && (
            <div className="stat">
              <span className="stat-value">{profile.rank}</span>
              <span className="stat-label">Rang</span>
            </div>
          )}
        </div>
        <div style={{ marginTop: 16 }}>
          <Button onClick={onLogout} variant="danger">
            Se déconnecter
          </Button>
        </div>
      </Card>
    </div>
  );
}
