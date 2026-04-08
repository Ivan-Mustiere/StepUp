import React, { useEffect, useRef, useState } from "react";
import * as ImagePicker from "expo-image-picker";
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import StepsScreen from "../screens/StepsScreen";
import Card from "../components/Card";
import Button from "../components/Button";
import { formatDate, statutLabel, statutColor } from "../utils/helpers";
import {
  updateProfile,
  uploadAvatar,
  changePassword,
  getFriends,
  getFriendRequestsIncoming,
  acceptFriendRequest,
  rejectFriendRequest,
  sendFriendRequest,
  removeFriend,
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
  getEquipes,
  getMyEquipes,
  setMyEquipes,
  API_BASE_URL,
} from "../api/api";

const PAYS = [
  { label: "France", flag: "🇫🇷" },
  { label: "États-Unis", flag: "🇺🇸" },
  { label: "Royaume-Uni", flag: "🇬🇧" },
  { label: "Allemagne", flag: "🇩🇪" },
  { label: "Espagne", flag: "🇪🇸" },
  { label: "Italie", flag: "🇮🇹" },
];

const REGIONS_BY_PAYS = {
  "France": ["Île-de-France", "Bretagne", "Normandie", "Occitanie", "Nouvelle-Aquitaine", "PACA", "Auvergne-Rhône-Alpes", "Hauts-de-France", "Grand Est", "Pays de la Loire"],
  "États-Unis": ["Californie", "New York", "Texas", "Floride", "Illinois", "Pennsylvanie", "Géorgie", "Washington"],
  "Royaume-Uni": ["Angleterre", "Écosse", "Pays de Galles", "Irlande du Nord"],
  "Allemagne": ["Bavière", "Berlin", "Hambourg", "Rhénanie", "Saxe", "Bade-Wurtemberg"],
  "Espagne": ["Catalogne", "Madrid", "Andalousie", "Valence", "Pays Basque", "Galice"],
  "Italie": ["Lombardie", "Lazio", "Campanie", "Sicile", "Vénétie", "Piémont"],
};

const TABS = [
  { id: "paris",       label: "Paris" },
  { id: "pas",         label: "Pas" },
  { id: "communautes", label: "Commu" },
  { id: "amis",        label: "Amis" },
  { id: "boutique",    label: "Boutique" },
];

const TAB_NAMES = {
  paris:       "Paris",
  pas:         "Pas",
  communautes: "Communautés",
  amis:        "Amis",
  boutique:    "Boutique",
  alertes:     "Alertes",
  profil:      "Mon profil",
};

export default function AppNavigator({ profile, onLogout, onRefreshProfile }) {
  const [tab, setTab] = useState("paris");
  const [currentProfile, setCurrentProfile] = useState(profile);
  const [alertesCount, setAlertesCount] = useState(0);
  const [alertesVisible, setAlertesVisible] = useState(false);

  useEffect(() => {
    setCurrentProfile(profile);
  }, [profile]);

  useEffect(() => {
    loadAlertesCount();
    const interval = setInterval(loadAlertesCount, 30000);
    return () => clearInterval(interval);
  }, []);

  async function loadAlertesCount() {
    try {
      const reqs = await getFriendRequestsIncoming();
      setAlertesCount(Array.isArray(reqs) ? reqs.length : 0);
    } catch (_) {}
  }

  async function handleRefresh() {
    await onRefreshProfile();
    loadAlertesCount();
  }

  function renderContent() {
    switch (tab) {
      case "paris":
        return <ParisScreen key={tab} profile={currentProfile} onBetPlaced={handleRefresh} />;
      case "pas":
        return <StepsScreen profile={currentProfile} onRefreshProfile={onRefreshProfile} />;
      case "communautes":
        return <CommunautesScreen profile={currentProfile} />;
      case "amis":
        return <AmisScreen currentUser={currentProfile} onAction={loadAlertesCount} />;
      case "boutique":
        return <BoutiqueScreen profile={currentProfile} onRefreshProfile={onRefreshProfile} />;
      case "profil":
        return <ProfilScreen profile={currentProfile} onLogout={onLogout} onRefreshProfile={onRefreshProfile} />;
      default:
        return null;
    }
  }

  const pseudo = currentProfile.pseudo ?? "?";
  const avatar = currentProfile.avatar ? { uri: API_BASE_URL + currentProfile.avatar } : null;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        {/* Gauche : monnaies */}
        <View style={styles.headerLeft}>
          <Text style={styles.headerStat}>💎 {currentProfile.gems ?? 0}</Text>
          <Text style={styles.headerStat}>🪙 {currentProfile.coins}</Text>
        </View>

        {/* Centre : nom de la page */}
        <Text style={styles.headerBrand}>{TAB_NAMES[tab]}</Text>

        {/* Droite : alertes + avatar */}
        <View style={styles.headerRight}>
          {/* Cloche alertes */}
          <TouchableOpacity style={styles.headerIconBtn} onPress={() => setAlertesVisible(true)}>
            <Text style={styles.headerIconEmoji}>🔔</Text>
            {alertesCount > 0 && (
              <View style={styles.headerBadge}>
                <Text style={styles.headerBadgeText}>
                  {alertesCount > 9 ? "9+" : alertesCount}
                </Text>
              </View>
            )}
          </TouchableOpacity>

          {/* Avatar profil */}
          <TouchableOpacity style={styles.headerAvatarBtn} onPress={() => setTab("profil")}>
            {avatar ? (
              <Image source={avatar} style={styles.headerAvatar} />
            ) : (
              <View style={styles.headerAvatarFallback}>
                <Text style={styles.headerAvatarText}>
                  {pseudo[0].toUpperCase()}
                </Text>
              </View>
            )}
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.content}>{renderContent()}</View>

      {/* Modal Alertes */}
      <Modal
        visible={alertesVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setAlertesVisible(false)}
      >
        <View style={styles.alertesOverlay}>
          <TouchableOpacity style={styles.alertesDismiss} onPress={() => setAlertesVisible(false)} />
          <View style={styles.alertesSheet}>
            <View style={styles.alertesSheetHandle} />
            <View style={styles.alertesSheetHeader}>
              <Text style={styles.alertesSheetTitle}>🔔 Alertes</Text>
              <TouchableOpacity onPress={() => setAlertesVisible(false)}>
                <Text style={styles.alertesSheetClose}>✕</Text>
              </TouchableOpacity>
            </View>
            <AlertesScreen
              currentUser={currentProfile}
              onAction={() => { loadAlertesCount(); }}
            />
          </View>
        </View>
      </Modal>

      <View style={styles.tabBar}>
        {TABS.map((t) => {
          const active = tab === t.id;
          return (
            <TouchableOpacity
              key={t.id}
              style={[styles.tabBtn, active && styles.tabBtnActive]}
              onPress={() => setTab(t.id)}
            >
              <Text style={[styles.tabLabel, active && styles.tabLabelActive]}>
                {t.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </SafeAreaView>
  );
}

// --- Écran Paris ---
const LIMIT = 20;

const CATEGORIES_PARIS = [
  { id: "League of Legends",  label: "LoL",      icon: null,  source: require("../assets/images/League_Of_Legende.png") },
  { id: "Valorant",           label: "Valorant", icon: null,  source: require("../assets/images/Valorant.png") },
  { id: "Rocket League",      label: "RL",       icon: null,  source: require("../assets/images/Rocket_League.png") },
];

const TEAM_LOGOS = {
  "T1":          require("../assets/images/Teams/T1.png"),
  "Fnatic":      require("../assets/images/Teams/Fanatic.png"),
  "Fanatic":     require("../assets/images/Teams/Fanatic.png"),
  "G2":          require("../assets/images/Teams/G2.png"),
  "G2 Esports":  require("../assets/images/Teams/G2.png"),
  "Gen.G":       require("../assets/images/Teams/Gen_G.png"),
  "NaVi":        require("../assets/images/Teams/Navi.png"),
  "Natus Vincere": require("../assets/images/Teams/Navi.png"),
  "Cloud9":      require("../assets/images/Teams/Cloud9.png"),
  "C9":          require("../assets/images/Teams/Cloud9.png"),
  "Team Liquid":  require("../assets/images/Teams/Team Liquid.png"),
  "Liquid":      require("../assets/images/Teams/Team Liquid.png"),
  "MAD Lions":   require("../assets/images/Teams/Mad_Lion.png"),
  "MAD":         require("../assets/images/Teams/Mad_Lion.png"),
};

function parseTeams(titre) {
  if (!titre) return { team1: null, team2: null, tournoi: null };
  // Format attendu : "Team1 vs Team2 — Tournoi" ou "Team1 vs Team2"
  const [matchPart, ...tournoiParts] = titre.split(/\s*[—–-]+\s*/);
  const tournoi = tournoiParts.join(" — ").trim() || null;
  const vsSplit = matchPart.split(/\s+vs\.?\s+/i);
  if (vsSplit.length >= 2) {
    return { team1: vsSplit[0].trim(), team2: vsSplit[1].trim(), tournoi };
  }
  return { team1: null, team2: null, tournoi };
}

function PariCard({ p, bettingId, betError, mise, maxCoins, onOpenBet, onAdjustMise, onChangeMise, onConfirm, onCancel, isFavorite }) {
  const now = Date.now();
  const debut = p.date_debut ? new Date(p.date_debut).getTime() : null;
  const parisFerme = debut && now >= debut - 15 * 60 * 1000;
  const enCours = debut && now >= debut && now <= debut + 3 * 60 * 60 * 1000;

  const statutColor = p.statut === "actif" ? "#16a34a" : p.statut === "regle" ? "#2563eb" : "#64748b";

  const { team1, team2, tournoi } = parseTeams(p.titre);
  const logo1 = team1 ? TEAM_LOGOS[team1] : null;
  const logo2 = team2 ? TEAM_LOGOS[team2] : null;
  const hasLogos = logo1 || logo2;

  return (
    <Card key={p.id}>
      {isFavorite && (
        <View style={styles.favoriteStarBadge} pointerEvents="none">
          <Text style={styles.favoriteStarText}>⭐</Text>
        </View>
      )}
      {hasLogos ? (
        <View style={styles.teamsHeader}>
          <View style={styles.teamBlock}>
            {logo1 ? (
              <Image source={logo1} style={styles.teamLogo} resizeMode="contain" />
            ) : (
              <View style={styles.teamLogoPlaceholder} />
            )}
            <Text style={styles.teamName} numberOfLines={1}>{team1}</Text>
          </View>
          <View style={styles.vsBlock}>
            <Text style={styles.vsText}>VS</Text>
            {p.statut !== "actif" && (
              <View style={[styles.badge, { backgroundColor: statutColor, marginTop: 4 }]}>
                <Text style={styles.badgeText}>{p.statut}</Text>
              </View>
            )}
          </View>
          <View style={styles.teamBlock}>
            {logo2 ? (
              <Image source={logo2} style={styles.teamLogo} resizeMode="contain" />
            ) : (
              <View style={styles.teamLogoPlaceholder} />
            )}
            <Text style={styles.teamName} numberOfLines={1}>{team2}</Text>
          </View>
        </View>
      ) : (
        <View style={styles.pronosticHeader}>
          <Text style={styles.pronosticCatIcon}>
            {CATEGORIES_PARIS.find((c) => c.id === p.categorie)?.icon ?? "🎮"}
          </Text>
          <Text style={styles.pronosticTitre} numberOfLines={1}>{p.titre}</Text>
          {p.statut !== "actif" && (
            <View style={[styles.badge, { backgroundColor: statutColor }]}>
              <Text style={styles.badgeText}>{p.statut}</Text>
            </View>
          )}
        </View>
      )}
      {tournoi && <Text style={styles.tournoiText}>{tournoi}</Text>}
      <Text style={styles.prediction}>"{p.prediction}"</Text>
      {p.description ? <Text style={styles.pariDesc}>{p.description}</Text> : null}
      <View style={styles.meta}>
        {p.date_debut && (
          <Text style={styles.metaText}>
            🕐 {new Date(p.date_debut).toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "short" })}
          </Text>
        )}
        {enCours && (
          <View style={styles.enDirectBadge}>
            <View style={styles.enDirectDot} />
            <Text style={styles.enDirectText}>EN DIRECT</Text>
          </View>
        )}
      </View>

      {p.statut === "actif" && parisFerme && (
        <View style={styles.parisFermeRow}>
          <Text style={styles.parisFermeText}>🔒 Paris fermés — moins de 15 min avant le début</Text>
        </View>
      )}
      {p.statut === "actif" && !parisFerme && !p.deja_parie && (
        bettingId === p.id ? (
          <View style={styles.betForm}>
            {betError ? <Text style={styles.error}>{betError}</Text> : null}
            <View style={styles.betMiseZone}>
              <View style={styles.betAdjustRow}>
                <TouchableOpacity style={styles.betAdjBtn} onPress={() => onAdjustMise(-100)}>
                  <Text style={styles.betAdjBtnText}>-100</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.betAdjBtn} onPress={() => onAdjustMise(-10)}>
                  <Text style={styles.betAdjBtnText}>-10</Text>
                </TouchableOpacity>
                <TextInput
                  style={styles.betMiseInput}
                  keyboardType="number-pad"
                  value={mise}
                  onChangeText={(v) => {
                    const n = parseInt(v, 10);
                    if (!v) { onChangeMise(""); return; }
                    if (!isNaN(n)) onChangeMise(String(Math.min(maxCoins, n)));
                  }}
                  onBlur={() => {
                    const n = parseInt(mise, 10);
                    if (isNaN(n) || n < 10) onChangeMise("10");
                  }}
                  textAlign="center"
                />
                <TouchableOpacity style={[styles.betAdjBtn, styles.betAdjBtnPlus]} onPress={() => onAdjustMise(10)}>
                  <Text style={[styles.betAdjBtnText, styles.betAdjBtnTextPlus]}>+10</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.betAdjBtn, styles.betAdjBtnPlus]} onPress={() => onAdjustMise(100)}>
                  <Text style={[styles.betAdjBtnText, styles.betAdjBtnTextPlus]}>+100</Text>
                </TouchableOpacity>
              </View>
              <Text style={styles.betMiseLabel}>🪙 coins</Text>
            </View>
            <View style={styles.actions}>
              <Button onPress={() => onConfirm(p.id)}>Confirmer</Button>
              <Button variant="secondary" onPress={onCancel}>Annuler</Button>
            </View>
          </View>
        ) : (
          <View style={styles.betButtonRow}>
            <Button onPress={() => onOpenBet(p.id)}>Parier</Button>
            <Text style={styles.betGemHint}>💎 1 gem</Text>
          </View>
        )
      )}
    </Card>
  );
}

function ParisScreen({ profile, onBetPlaced }) {
  const [paris, setParis] = useState([]);
  const [categorie, setCategorie] = useState("League of Legends");
  const [loading, setLoading] = useState(false);
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState("");
  const [bettingId, setBettingId] = useState(null);
  const [mise, setMise] = useState("");
  const [betError, setBetError] = useState("");
  const [betSuccess, setBetSuccess] = useState(null);
  const [equipesNames, setEquipesNames] = useState([]);

  async function load(reset = false) {
    setLoading(true);
    setError("");
    const currentOffset = reset ? 0 : offset;
    try {
      const params = new URLSearchParams({ limit: LIMIT, offset: currentOffset });
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
    getMyEquipes().then((eq) => setEquipesNames(eq.map((e) => e.nom))).catch(() => {});
  }, []);

  function isPariOuvert(p) {
    if (!p.date_debut) return true;
    const cutoff = new Date(p.date_debut).getTime() - 15 * 60 * 1000;
    return Date.now() < cutoff;
  }

  function isFavoriteMatch(p) {
    if (equipesNames.length === 0) return false;
    const { team1, team2 } = parseTeams(p.titre);
    return equipesNames.some((n) => n === team1 || n === team2);
  }

  const parisFiltres = paris.filter((p) => p.categorie === categorie);
  const mesParis    = parisFiltres.filter((p) => p.deja_parie);
  const autresParisBruts = parisFiltres.filter((p) => !p.deja_parie && isPariOuvert(p));
  // Favoris en premier, puis le reste
  const autresParis = [
    ...autresParisBruts.filter((p) => isFavoriteMatch(p)),
    ...autresParisBruts.filter((p) => !isFavoriteMatch(p)),
  ];

  async function handleBet(pariId) {
    setBetError("");
    setBetSuccess(null);
    try {
      const result = await placeBet(pariId, Number(mise));
      setBetSuccess(result);
      setMise("");
      setBettingId(null);
      onBetPlaced();
      load(true);
    } catch (err) {
      setBetError(err.message);
    }
  }

  function openBet(pariId) {
    setBettingId(pariId);
    const coins = profile?.coins ?? 0;
    setMise(String(Math.min(coins, 150)));
    setBetError("");
    setBetSuccess(null);
  }

  const maxCoins = profile?.coins ?? 0;

  function adjustMise(delta) {
    const current = parseInt(mise, 10) || 0;
    const next = Math.min(maxCoins, Math.max(10, current + delta));
    setMise(String(next));
  }

  const cardProps = {
    bettingId, betError, mise, maxCoins,
    onOpenBet: openBet,
    onAdjustMise: adjustMise,
    onChangeMise: setMise,
    onConfirm: handleBet,
    onCancel: () => setBettingId(null),
    isFavoriteMatch,
  };

  return (
    <View style={styles.screen}>
      {(profile.coins_en_jeu ?? 0) > 0 && (
        <View style={styles.enJeuBanner}>
          <Text style={styles.enJeuBadge}>🔒 {profile.coins_en_jeu} coins en jeu</Text>
        </View>
      )}

      {/* Nav : catégorie / jeu */}
      <View style={styles.catBar}>
        {CATEGORIES_PARIS.map((c) => (
          <TouchableOpacity
            key={c.id}
            style={[styles.catBtn, categorie === c.id && styles.catBtnActive]}
            onPress={() => setCategorie(c.id)}
          >
            {c.source
              ? <Image source={c.source} style={styles.catBtnImage} resizeMode="contain" />
              : <Text style={styles.catBtnIcon}>{c.icon}</Text>
            }
            <Text style={[styles.catBtnLabel, categorie === c.id && styles.catBtnLabelActive]}>
              {c.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
        {betSuccess && (
          <View style={styles.betSuccess}>
            <Text style={styles.betSuccessText}>
              ✓ Mise de {betSuccess.mise} coins placée — il vous reste {betSuccess.coins_restants} coins
            </Text>
          </View>
        )}
        {error ? <Text style={styles.error}>{error}</Text> : null}

        {/* Bloc : mes paris */}
        {mesParis.length > 0 && (
          <>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>🎯 Mes paris</Text>
            </View>
            {mesParis.map((p) => <PariCard key={p.id} p={p} {...cardProps} isFavorite={isFavoriteMatch(p)} />)}
          </>
        )}

        {/* Bloc : paris disponibles */}
        {autresParis.length > 0 && (
          <>
            {mesParis.length > 0 && (
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>⚡ Paris disponibles</Text>
              </View>
            )}
            {autresParis.map((p) => <PariCard key={p.id} p={p} {...cardProps} isFavorite={isFavoriteMatch(p)} />)}
          </>
        )}

        {parisFiltres.length === 0 && !loading && (
          <Text style={styles.empty}>Aucun pari disponible.</Text>
        )}
        {loading && <ActivityIndicator style={styles.loader} />}

        {hasMore && !loading && (
          <View style={styles.centerBtn}>
            <Button onPress={() => load(false)} variant="secondary">Voir plus</Button>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

// --- Écran Communautés ---
function CommunautesScreen({ profile }) {
  const [communautes, setCommunautes] = useState([]);
  const [error, setError] = useState("");
  const [openChat, setOpenChat] = useState(null);
  const [classementModal, setClassementModal] = useState(null);

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

  return (
    <View style={styles.screen}>
      {classementModal && (
        <ClassementModal
          communaute={classementModal}
          profile={profile}
          onClose={() => setClassementModal(null)}
        />
      )}



      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
        {error ? <Text style={styles.error}>{error}</Text> : null}

        {Object.entries(parJeu).map(([jeu, liste]) => (
          <View key={jeu} style={styles.section}>
            <Text style={styles.jeuLabel}>{jeu}</Text>
            {liste.map((c) => (
              <Card key={c.id}>
                <View style={styles.communauteHeader}>
                  <Text style={styles.communauteNom}>{c.nom}</Text>
                  <Text style={styles.communauteMembres}>
                    {c.nb_membres} membre{c.nb_membres !== 1 ? "s" : ""}
                  </Text>
                </View>
                {c.description ? <Text style={styles.communauteDesc}>{c.description}</Text> : null}
                <View style={styles.actions}>
                  {c.est_membre ? (
                    <>
                      <Button onPress={() => setOpenChat(c)}>💬 Chat</Button>
                      <Button variant="secondary" onPress={() => setClassementModal(c)}>🏆 Classement</Button>
                      <Button variant="secondary" onPress={() => handleLeave(c.id)}>Quitter</Button>
                    </>
                  ) : (
                    <>
                      <Button onPress={() => handleJoin(c.id)}>Rejoindre</Button>
                      <Button variant="secondary" onPress={() => setClassementModal(c)}>🏆 Classement</Button>
                    </>
                  )}
                </View>
              </Card>
            ))}
          </View>
        ))}

        {communautes.length === 0 && (
          <Text style={styles.empty}>Aucune communauté disponible.</Text>
        )}
      </ScrollView>
    </View>
  );
}

// --- Classement (Modal popup) ---
function ClassementModal({ communaute, profile, onClose }) {
  const [classement, setClassement] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [profileModal, setProfileModal] = useState(null);

  const MEDALS = ["🥇", "🥈", "🥉"];

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

  const top3 = classement.slice(0, 3);
  const me = classement.find((u) => u.pseudo === profile.pseudo);
  const meInTop3 = me && me.rang <= 3;

  function renderRow(u, highlight = false) {
    const isMe = u.pseudo === profile.pseudo;
    return (
      <Card
        key={u.id}
        style={[
          isMe && meInTop3 ? styles.classementTopMe : null,
          isMe && !meInTop3 ? styles.classementMe : null,
        ]}
        onPress={!isMe ? () => setProfileModal(u) : undefined}
      >
        <View style={styles.classementItem}>
          <Text style={styles.classementRang}>
            {u.rang <= 3 ? MEDALS[u.rang - 1] : `#${u.rang}`}
          </Text>
          <View style={styles.classementInfo}>
            <Text style={styles.classementPseudo}>
              {u.pseudo} {isMe && <Text style={styles.meTag}>(vous)</Text>}
            </Text>
            <Text style={styles.classementXp}>{u.xp_total} XP</Text>
          </View>
          <Text style={styles.classementCoins}>🪙 {u.coins}</Text>
        </View>
      </Card>
    );
  }

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      {profileModal && (
        <ProfileModal
          user={profileModal}
          currentUser={profile}
          onClose={() => setProfileModal(null)}
        />
      )}
      <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={onClose}>
        <View style={styles.classementModalCard} onStartShouldSetResponder={() => true}>
          <View style={styles.classementModalHeader}>
            <View>
              <Text style={styles.screenTitle}>🏆 Classement</Text>
              <Text style={styles.jeuTag}>{communaute.nom}</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.modalClose}>
              <Text style={styles.modalCloseText}>✕</Text>
            </TouchableOpacity>
          </View>

          {loading && <ActivityIndicator style={styles.loader} />}
          {error ? <Text style={styles.error}>{error}</Text> : null}

          {!loading && classement.length === 0 && (
            <Text style={styles.empty}>Aucun membre dans cette communauté.</Text>
          )}

          {top3.length > 0 && (
            <>
              <Text style={styles.classementSectionLabel}>TOP 3</Text>
              {top3.map((u) => renderRow(u))}
            </>
          )}

          {me && !meInTop3 && (
            <>
              <View style={styles.classementDivider}>
                <View style={styles.classementDividerLine} />
                <Text style={styles.classementDividerText}>Votre position</Text>
                <View style={styles.classementDividerLine} />
              </View>
              {renderRow(me)}
            </>
          )}
        </View>
      </TouchableOpacity>
    </Modal>
  );
}

// --- Chat communauté ---
function ChatScreen({ communaute, profile, onBack }) {
  const [messages, setMessages] = useState([]);
  const [texte, setTexte] = useState("");
  const [error, setError] = useState("");
  const [profileModal, setProfileModal] = useState(null);
  const scrollRef = useRef(null);
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
    if (messages.length > 0) {
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
    }
  }, [messages]);

  async function handleSend() {
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
    const msg = messages.find((m) => m.pseudo === pseudo);
    if (!msg?.user_id) return;
    try {
      const user = await getUserProfile(msg.user_id);
      setProfileModal(user);
    } catch (_) {}
  }

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 0}
    >
      {profileModal && (
        <ProfileModal
          user={profileModal}
          currentUser={profile}
          onClose={() => setProfileModal(null)}
        />
      )}

      <View style={styles.chatNav}>
        <Button onPress={onBack} variant="secondary">← Retour</Button>
        <View style={{ alignItems: "center" }}>
          <Text style={styles.chatNavTitle}>{communaute.nom}</Text>
          <Text style={styles.jeuTag}>{communaute.jeu}</Text>
        </View>
        <View style={styles.placeholder} />
      </View>

      <ScrollView
        ref={scrollRef}
        style={styles.chatMessages}
        showsVerticalScrollIndicator={false}
      >
        {messages.length === 0 && (
          <Text style={styles.empty}>Aucun message. Soyez le premier !</Text>
        )}
        {messages.map((m) => {
          const isMine = m.pseudo === profile.pseudo;
          return (
            <View key={m.id} style={[styles.bubbleRow, isMine ? styles.bubbleRowMine : styles.bubbleRowOther]}>
              {!isMine && (
                <TouchableOpacity onPress={() => handleOpenProfile(m.pseudo)}>
                  <Text style={styles.bubbleAuthor}>{m.pseudo}</Text>
                </TouchableOpacity>
              )}
              <View style={[styles.bubble, isMine ? styles.bubbleMine : styles.bubbleOther]}>
                <Text style={[styles.bubbleText, isMine ? styles.bubbleTextMine : styles.bubbleTextOther]}>
                  {m.contenu}
                </Text>
              </View>
              <Text style={styles.bubbleTime}>
                {new Date(m.created_at).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
              </Text>
            </View>
          );
        })}
        {error ? <Text style={styles.error}>{error}</Text> : null}
      </ScrollView>

      <View style={styles.chatInputBar}>
        <TextInput
          style={styles.chatInput}
          placeholder="Votre message..."
          value={texte}
          onChangeText={setTexte}
          maxLength={500}
          multiline
        />
        <Button onPress={handleSend} disabled={!texte.trim()}>Envoyer</Button>
      </View>
    </KeyboardAvoidingView>
  );
}

// --- Modal profil ---
function ProfileModal({ user, currentUser, onClose }) {
  const [requestState, setRequestState] = useState("idle");
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
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={onClose}>
        <View style={styles.modalCard} onStartShouldSetResponder={() => true}>
          <TouchableOpacity style={styles.modalClose} onPress={onClose}>
            <Text style={styles.modalCloseText}>✕</Text>
          </TouchableOpacity>

          <View style={styles.profilInfo}>
            <View style={styles.profilAvatar}>
              <Text style={styles.profilAvatarText}>{user.pseudo?.[0]?.toUpperCase()}</Text>
            </View>
            <Text style={styles.profilPseudo}>{user.pseudo}</Text>
            {!isSelf && (
              <View style={{ marginTop: 8 }}>
                {requestState === "sent" ? (
                  <Text style={styles.sentLabel}>Demande envoyée ✓</Text>
                ) : (
                  <Button
                    onPress={handleAskFriend}
                    disabled={requestState === "loading"}
                  >
                    {requestState === "loading" ? "..." : "Demander en ami"}
                  </Button>
                )}
                {requestState === "error" && <Text style={styles.error}>{errorMsg}</Text>}
              </View>
            )}
          </View>

          <View style={styles.profilStats}>
            <View style={styles.stat}>
              <Text style={styles.statValue}>{user.coins}</Text>
              <Text style={styles.statLabel}>Coins</Text>
            </View>
            <View style={styles.stat}>
              <Text style={styles.statValue}>{user.xp_total}</Text>
              <Text style={styles.statLabel}>XP</Text>
            </View>
          </View>

          {user.communautes?.length > 0 && (
            <View style={{ marginTop: 12 }}>
              <Text style={styles.label}>Communautés</Text>
              <View style={styles.commuTags}>
                {user.communautes.map((c) => (
                  <View key={c} style={styles.commuTag}>
                    <Text style={styles.commuTagText}>{c}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}
        </View>
      </TouchableOpacity>
    </Modal>
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
  const [confirmRemove, setConfirmRemove] = useState(null); // { id, pseudo }

  async function doRemoveFriend() {
    try {
      await removeFriend(confirmRemove.id);
      setConfirmRemove(null);
      loadData();
    } catch (err) {
      setError(err.message);
      setConfirmRemove(null);
    }
  }

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

  useEffect(() => { loadData(); }, []);

  async function handleSearch() {
    if (!friendId.trim()) return;
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

  if (openPrivateChat) {
    return (
      <PrivateChatScreen
        friend={openPrivateChat}
        currentUser={currentUser}
        onBack={() => setOpenPrivateChat(null)}
      />
    );
  }

  return (
    <View style={styles.screen}>
      {profileModal && (
        <ProfileModal
          user={profileModal}
          currentUser={currentUser}
          onClose={() => setProfileModal(null)}
        />
      )}



      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
        <Card>
          <Text style={styles.sectionTitle}>Ajouter un ami</Text>
          <View style={styles.searchRow}>
            <TextInput
              style={[styles.input, { flex: 1, marginBottom: 0 }]}
              placeholder="ID utilisateur"
              keyboardType="number-pad"
              value={friendId}
              onChangeText={(v) => {
                setFriendId(v);
                setPreview(null);
                setRequestSent(false);
                setPreviewError("");
              }}
            />
            <Button onPress={handleSearch} disabled={previewLoading}>
              {previewLoading ? "..." : "Chercher"}
            </Button>
          </View>

          {previewError ? <Text style={styles.error}>{previewError}</Text> : null}

          {preview && (
            <View style={styles.userPreview}>
              <View style={styles.previewAvatar}>
                <Text style={styles.previewAvatarText}>{preview.pseudo?.[0]?.toUpperCase()}</Text>
              </View>
              <View style={styles.previewInfo}>
                <Text style={styles.previewPseudo}>{preview.pseudo}</Text>
                <Text style={styles.previewMeta}>{preview.xp_total} XP · {preview.coins} coins</Text>
              </View>
              <View>
                {requestSent ? (
                  <Text style={styles.sentLabel}>Envoyée ✓</Text>
                ) : (
                  <Button onPress={handleSendRequest}>+ Ami</Button>
                )}
              </View>
            </View>
          )}
        </Card>

        {incoming.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Demandes reçues ({incoming.length})</Text>
            {error ? <Text style={styles.error}>{error}</Text> : null}
            {incoming.map((r) => (
              <Card key={r.request_id}>
                <View style={styles.friendItem}>
                  <Text style={styles.friendPseudo}>{r.sender_pseudo}</Text>
                  <View style={styles.actions}>
                    <Button onPress={() => handleAccept(r.request_id)}>Accepter</Button>
                    <Button variant="danger" onPress={() => handleReject(r.request_id)}>Refuser</Button>
                  </View>
                </View>
              </Card>
            ))}
          </View>
        )}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Mes amis ({friends.length})</Text>
          {friends.length === 0 ? (
            <Text style={styles.empty}>Aucun ami pour l'instant.</Text>
          ) : (
            friends.map((f) => (
              <Card key={f.id}>
                <View style={styles.friendItem}>
                  <TouchableOpacity style={{ flex: 1 }} onPress={() => setProfileModal(f)}>
                    <Text style={styles.friendPseudo}>{f.pseudo}</Text>
                    <Text style={styles.friendMeta}>{f.xp_total} XP · {f.coins} coins</Text>
                  </TouchableOpacity>
                  <Button onPress={() => setOpenPrivateChat(f)}>💬</Button>
                  <Button variant="danger" onPress={() => setConfirmRemove({ id: f.id, pseudo: f.pseudo })}>✕</Button>
                </View>
              </Card>
            ))
          )}
        </View>
      </ScrollView>

      {/* Modal confirmation suppression ami */}
      <Modal
        visible={!!confirmRemove}
        transparent
        animationType="fade"
        onRequestClose={() => setConfirmRemove(null)}
      >
        <View style={styles.confirmOverlay}>
          <View style={styles.confirmCard}>
            <Text style={styles.confirmTitle}>Supprimer un ami</Text>
            <Text style={styles.confirmMsg}>
              Voulez-vous retirer{" "}
              <Text style={{ fontWeight: "700" }}>{confirmRemove?.pseudo}</Text>{" "}
              de votre liste d'amis ?
            </Text>
            <View style={styles.confirmActions}>
              <TouchableOpacity
                style={styles.confirmBtnCancel}
                onPress={() => setConfirmRemove(null)}
              >
                <Text style={styles.confirmBtnCancelText}>Annuler</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.confirmBtnDelete}
                onPress={doRemoveFriend}
              >
                <Text style={styles.confirmBtnDeleteText}>Supprimer</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

// --- Chat privé ---
function PrivateChatScreen({ friend, currentUser, onBack }) {
  const [messages, setMessages] = useState([]);
  const [texte, setTexte] = useState("");
  const [error, setError] = useState("");
  const scrollRef = useRef(null);
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
    if (messages.length > 0) {
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
    }
  }, [messages]);

  async function handleSend() {
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
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <View style={styles.chatNav}>
        <Button onPress={onBack} variant="secondary">← Retour</Button>
        <View style={styles.chatHeaderInfo}>
          <View style={styles.chatAvatar}>
            <Text style={styles.chatAvatarText}>{friend.pseudo?.[0]?.toUpperCase()}</Text>
          </View>
          <Text style={styles.chatNavTitle}>{friend.pseudo}</Text>
        </View>
        <View style={styles.placeholder} />
      </View>

      <ScrollView
        ref={scrollRef}
        style={styles.chatMessages}
        showsVerticalScrollIndicator={false}
      >
        {messages.length === 0 && (
          <Text style={styles.empty}>Aucun message. Commencez la conversation !</Text>
        )}
        {messages.map((m) => (
          <View key={m.id} style={[styles.bubbleRow, m.is_mine ? styles.bubbleRowMine : styles.bubbleRowOther]}>
            <View style={[styles.bubble, m.is_mine ? styles.bubbleMine : styles.bubbleOther]}>
              <Text style={[styles.bubbleText, m.is_mine ? styles.bubbleTextMine : styles.bubbleTextOther]}>
                {m.contenu}
              </Text>
            </View>
            <Text style={styles.bubbleTime}>
              {new Date(m.created_at).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
            </Text>
          </View>
        ))}
        {error ? <Text style={styles.error}>{error}</Text> : null}
      </ScrollView>

      <View style={styles.chatInputBar}>
        <TextInput
          style={styles.chatInput}
          placeholder={`Message à ${friend.pseudo}...`}
          value={texte}
          onChangeText={setTexte}
          maxLength={1000}
          multiline
        />
        <Button onPress={handleSend} disabled={!texte.trim()}>Envoyer</Button>
      </View>
    </KeyboardAvoidingView>
  );
}

// --- Boutique ---
const ARTICLES = [
  {
    id: "gems_to_coins",
    section: "Échange",
    nom: "Échange Gems → Coins",
    description: "Convertissez 1 💎 en 50 🪙",
    prix: 1,
    devise: "gems",
    emoji: "💱",
  },
  {
    id: "boost_xp",
    section: "Boosts",
    nom: "Boost XP ×2",
    description: "Doublez vos gains d'XP pendant 24h",
    prix: 5,
    devise: "gems",
    emoji: "⚡",
  },
  {
    id: "mise_double",
    section: "Boosts",
    nom: "Mise assurée",
    description: "Remboursement si vous perdez votre prochain pari",
    prix: 3,
    devise: "gems",
    emoji: "🛡️",
  },
  {
    id: "streak_freeze",
    section: "Boosts",
    nom: "Streak Freeze",
    description: "Protégez votre série pour 1 jour",
    prix: 2,
    devise: "gems",
    emoji: "🧊",
  },
  {
    id: "pack_100",
    section: "Packs Coins",
    nom: "Pack Starter",
    description: "100 🪙 directement sur votre compte",
    prix: 2,
    devise: "gems",
    emoji: "💰",
  },
  {
    id: "pack_500",
    section: "Packs Coins",
    nom: "Pack Premium",
    description: "500 🪙 + bonus 50 🪙 offerts",
    prix: 8,
    devise: "gems",
    emoji: "💎",
  },
];

function BoutiqueScreen({ profile }) {
  const sections = [...new Set(ARTICLES.map((a) => a.section))];

  function handleAcheter(article) {
    Alert.alert(
      "Bientôt disponible",
      `La boutique arrive prochainement ! L'article "${article.nom}" sera disponible à l'achat.`,
      [{ text: "OK" }]
    );
  }

  return (
    <View style={styles.screen}>

      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.boutiqueHero}>
          <Text style={styles.boutiqueHeroText}>🛒 Dépensez vos Gems</Text>
          <Text style={styles.boutiqueHeroSub}>Marchez pour gagner des 💎 et débloquez des avantages</Text>
        </View>

        {sections.map((section) => (
          <View key={section} style={styles.section}>
            <Text style={styles.sectionTitle}>{section}</Text>
            {ARTICLES.filter((a) => a.section === section).map((article) => (
              <Card key={article.id} style={styles.articleCard}>
                <View style={styles.articleRow}>
                  <Text style={styles.articleEmoji}>{article.emoji}</Text>
                  <View style={styles.articleInfo}>
                    <Text style={styles.articleNom}>{article.nom}</Text>
                    <Text style={styles.articleDesc}>{article.description}</Text>
                  </View>
                  <TouchableOpacity
                    style={styles.acheterBtn}
                    onPress={() => handleAcheter(article)}
                  >
                    <Text style={styles.acheterBtnPrix}>
                      {article.prix} {article.devise === "gems" ? "💎" : "🪙"}
                    </Text>
                    <Text style={styles.acheterBtnLabel}>Acheter</Text>
                  </TouchableOpacity>
                </View>
              </Card>
            ))}
          </View>
        ))}

        <View style={styles.bientotBox}>
          <Text style={styles.bientotText}>🚀 Plus d'articles bientôt disponibles</Text>
        </View>
      </ScrollView>
    </View>
  );
}

// --- Alertes ---
function AlertesScreen({ currentUser, onAction }) {
  const [demandesAmis, setDemandesAmis] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function loadAlertes() {
    setLoading(true);
    try {
      const requests = await getFriendRequestsIncoming();
      setDemandesAmis(requests.filter((r) => r.status === "pending"));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadAlertes(); }, []);

  async function handleAccept(requestId) {
    try {
      await acceptFriendRequest(requestId);
      loadAlertes();
      onAction?.();
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleReject(requestId) {
    try {
      await rejectFriendRequest(requestId);
      loadAlertes();
      onAction?.();
    } catch (err) {
      setError(err.message);
    }
  }

  const totalAlertes = demandesAmis.length;

  return (
    <View style={styles.screen}>

      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
        {loading && <ActivityIndicator style={styles.loader} />}
        {error ? <Text style={styles.error}>{error}</Text> : null}

        {demandesAmis.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.alerteSectionTitle}>👥 Demandes d'amis</Text>
            {demandesAmis.map((r) => (
              <Card key={r.request_id} style={styles.alerteCard}>
                <View style={styles.alerteRow}>
                  <View style={styles.alerteAvatar}>
                    <Text style={styles.alerteAvatarText}>
                      {r.sender_pseudo?.[0]?.toUpperCase()}
                    </Text>
                  </View>
                  <View style={styles.alerteInfo}>
                    <Text style={styles.alerteTitle}>
                      <Text style={{ fontWeight: "700" }}>{r.sender_pseudo}</Text> veut être votre ami
                    </Text>
                    <Text style={styles.alerteTime}>
                      {new Date(r.created_at).toLocaleDateString("fr-FR")}
                    </Text>
                  </View>
                </View>
                <View style={styles.actions}>
                  <Button onPress={() => handleAccept(r.request_id)}>Accepter</Button>
                  <Button variant="danger" onPress={() => handleReject(r.request_id)}>Refuser</Button>
                </View>
              </Card>
            ))}
          </View>
        )}

        {!loading && totalAlertes === 0 && (
          <View style={styles.alerteVide}>
            <Text style={styles.alerteVideEmoji}>🔔</Text>
            <Text style={styles.alerteVideTitle}>Aucune alerte</Text>
            <Text style={styles.alerteVideSub}>Vous êtes à jour !</Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

// --- Écran Profil ---
function ProfilScreen({ profile, onLogout, onRefreshProfile }) {
  const [section, setSection] = useState(null); // null | "infos" | "password" | "equipes"
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [form, setForm] = useState({
    pseudo: profile.pseudo || "",
    age: profile.age ? String(profile.age) : "",
    genre: profile.genre || "",
    pays: profile.pays || "",
    region: profile.region || "",
  });
  const [pwForm, setPwForm] = useState({ current: "", next: "", confirm: "" });
  const [mesEquipes, setMesEquipes] = useState([]);
  const [toutesEquipes, setToutesEquipes] = useState([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function handlePickAvatar() {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permission refusée", "Autorisez l'accès à la galerie pour changer votre photo.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (result.canceled) return;
    setAvatarUploading(true);
    try {
      await uploadAvatar(result.assets[0].uri);
      await onRefreshProfile();
      setSuccess("Photo de profil mise à jour !");
    } catch (err) {
      setError(err.message);
    } finally {
      setAvatarUploading(false);
    }
  }

  async function handleSaveInfos() {
    setError("");
    setSuccess("");
    setSaving(true);
    const payload = {};
    if (form.pseudo !== profile.pseudo) payload.pseudo = form.pseudo;
    if (form.age) payload.age = Number(form.age);
    if (form.genre) payload.genre = form.genre;
    if (form.pays) payload.pays = form.pays;
    if (form.region) payload.region = form.region;

    if (Object.keys(payload).length === 0) {
      setError("Aucune modification détectée.");
      setSaving(false);
      return;
    }
    try {
      await updateProfile(payload);
      await onRefreshProfile();
      setSuccess("Profil mis à jour !");
      setSection(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleChangePassword() {
    setError("");
    setSuccess("");
    if (pwForm.next !== pwForm.confirm) {
      setError("Les nouveaux mots de passe ne correspondent pas.");
      return;
    }
    setSaving(true);
    try {
      await changePassword(pwForm.current, pwForm.next);
      setSuccess("Mot de passe modifié !");
      setPwForm({ current: "", next: "", confirm: "" });
      setSection(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  useEffect(() => {
    getMyEquipes().then((mes) => setMesEquipes(mes)).catch(() => {});
  }, []);

  async function loadEquipes() {
    try {
      const [toutes, mes] = await Promise.all([getEquipes(), getMyEquipes()]);
      setToutesEquipes(toutes);
      setMesEquipes(mes);
    } catch (_) {}
  }

  function toggleEquipe(equipe) {
    setMesEquipes((prev) => {
      const already = prev.find((e) => e.id === equipe.id);
      if (already) return prev.filter((e) => e.id !== equipe.id);
      if (prev.length >= 3) return prev;
      return [...prev, equipe];
    });
  }

  async function handleSaveEquipes() {
    setError("");
    setSuccess("");
    setSaving(true);
    try {
      await setMyEquipes(mesEquipes.map((e) => e.id));
      setSuccess("Équipes enregistrées !");
      setSection(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  const GENRES = ["homme", "femme", "autre"];

  return (
    <View style={styles.screen}>


      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Carte identité */}
        <Card>
          <View style={styles.profilInfo}>
            <TouchableOpacity style={styles.profilAvatarWrapper} onPress={handlePickAvatar} disabled={avatarUploading}>
              {profile.avatar ? (
                <Image
                  source={{ uri: API_BASE_URL + profile.avatar }}
                  style={styles.profilAvatarImg}
                />
              ) : (
                <View style={styles.profilAvatar}>
                  <Text style={styles.profilAvatarText}>{profile.pseudo?.[0]?.toUpperCase()}</Text>
                </View>
              )}
              <View style={styles.profilAvatarEditBadge}>
                {avatarUploading
                  ? <ActivityIndicator size="small" color="#fff" />
                  : <Text style={styles.profilAvatarEditIcon}>📷</Text>
                }
              </View>
            </TouchableOpacity>
            <Text style={styles.profilPseudo}>{profile.pseudo}</Text>
            <Text style={styles.profilEmail}>{profile.email}</Text>
            <Text style={styles.profilId}>ID : {profile.id}</Text>
          </View>

          <View style={styles.profilStats}>
            <View style={styles.stat}>
              <Text style={styles.statValue}>{profile.coins}</Text>
              <Text style={styles.statLabel}>Coins</Text>
            </View>
            <View style={styles.stat}>
              <Text style={styles.statValue}>{profile.xp_total}</Text>
              <Text style={styles.statLabel}>XP total</Text>
            </View>
            {profile.rank ? (
              <View style={styles.stat}>
                <Text style={styles.statValue}>{profile.rank}</Text>
                <Text style={styles.statLabel}>Rang</Text>
              </View>
            ) : null}
          </View>

          {mesEquipes.length > 0 && (
            <View style={styles.profilEquipesRow}>
              {mesEquipes.map((e) => {
                const logo = TEAM_LOGOS[e.nom];
                return (
                  <View key={e.id} style={styles.profilEquipeItem}>
                    {logo ? (
                      <Image source={logo} style={styles.profilEquipeLogo} resizeMode="contain" />
                    ) : (
                      <View style={[styles.profilEquipeColorDot, { backgroundColor: e.couleur }]} />
                    )}
                    <Text style={[styles.profilEquipeNom, { color: e.couleur }]}>{e.nom}</Text>
                  </View>
                );
              })}
            </View>
          )}
        </Card>

        {success ? (
          <View style={styles.successBox}>
            <Text style={styles.successText}>✓ {success}</Text>
          </View>
        ) : null}

        {/* Modifier les infos */}
        <TouchableOpacity
          style={styles.editSection}
          onPress={() => { setSection(section === "infos" ? null : "infos"); setError(""); setSuccess(""); }}
        >
          <Text style={styles.editSectionTitle}>✏️ Modifier le profil</Text>
          <Text style={styles.editSectionChevron}>{section === "infos" ? "▲" : "▼"}</Text>
        </TouchableOpacity>

        {section === "infos" && (
          <Card style={styles.editCard}>
            {error ? <Text style={styles.error}>{error}</Text> : null}

            <Text style={styles.fieldLabel}>Pseudo</Text>
            <TextInput
              style={styles.input}
              value={form.pseudo}
              onChangeText={(v) => setForm((p) => ({ ...p, pseudo: v }))}
              autoCapitalize="none"
            />

            <Text style={styles.fieldLabel}>Age</Text>
            <TextInput
              style={styles.input}
              value={form.age}
              onChangeText={(v) => setForm((p) => ({ ...p, age: v }))}
              keyboardType="number-pad"
              placeholder="Non renseigné"
            />

            <Text style={styles.fieldLabel}>Genre</Text>
            <View style={styles.selectRow}>
              {GENRES.map((g) => (
                <TouchableOpacity
                  key={g}
                  style={[styles.selectOption, form.genre === g && styles.selectOptionActive]}
                  onPress={() => setForm((p) => ({ ...p, genre: g }))}
                >
                  <Text style={[styles.selectOptionText, form.genre === g && styles.selectOptionTextActive]}>
                    {g.charAt(0).toUpperCase() + g.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.fieldLabel}>Pays</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipsScroll}>
              {PAYS.map(({ label, flag }) => (
                <TouchableOpacity
                  key={label}
                  style={[styles.chip, form.pays === label && styles.chipActive]}
                  onPress={() => setForm((prev) => ({ ...prev, pays: label, region: "" }))}
                >
                  <Text style={[styles.chipText, form.pays === label && styles.chipTextActive]}>
                    {label} {flag}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {form.pays && REGIONS_BY_PAYS[form.pays] && (
              <>
                <Text style={styles.fieldLabel}>Région</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipsScroll}>
                  {REGIONS_BY_PAYS[form.pays].map((r) => (
                    <TouchableOpacity
                      key={r}
                      style={[styles.chip, form.region === r && styles.chipActive]}
                      onPress={() => setForm((prev) => ({ ...prev, region: r }))}
                    >
                      <Text style={[styles.chipText, form.region === r && styles.chipTextActive]}>{r}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </>
            )}

            <Button onPress={handleSaveInfos} disabled={saving}>
              {saving ? "Sauvegarde..." : "Enregistrer"}
            </Button>
          </Card>
        )}

        {/* Changer le mot de passe */}
        <TouchableOpacity
          style={styles.editSection}
          onPress={() => { setSection(section === "password" ? null : "password"); setError(""); setSuccess(""); }}
        >
          <Text style={styles.editSectionTitle}>🔒 Changer le mot de passe</Text>
          <Text style={styles.editSectionChevron}>{section === "password" ? "▲" : "▼"}</Text>
        </TouchableOpacity>

        {section === "password" && (
          <Card style={styles.editCard}>
            {error ? <Text style={styles.error}>{error}</Text> : null}

            <Text style={styles.fieldLabel}>Mot de passe actuel</Text>
            <TextInput
              style={styles.input}
              value={pwForm.current}
              onChangeText={(v) => setPwForm((p) => ({ ...p, current: v }))}
              secureTextEntry
              placeholder="••••••••"
            />

            <Text style={styles.fieldLabel}>Nouveau mot de passe</Text>
            <TextInput
              style={styles.input}
              value={pwForm.next}
              onChangeText={(v) => setPwForm((p) => ({ ...p, next: v }))}
              secureTextEntry
              placeholder="••••••••"
            />

            <Text style={styles.fieldLabel}>Confirmer le nouveau mot de passe</Text>
            <TextInput
              style={styles.input}
              value={pwForm.confirm}
              onChangeText={(v) => setPwForm((p) => ({ ...p, confirm: v }))}
              secureTextEntry
              placeholder="••••••••"
            />

            <Text style={styles.pwHint}>
              Doit contenir : majuscule, minuscule, chiffre et caractère spécial (min. 8 caractères)
            </Text>

            <Button onPress={handleChangePassword} disabled={saving}>
              {saving ? "Modification..." : "Changer le mot de passe"}
            </Button>
          </Card>
        )}

        {/* Section équipes esport */}
        <TouchableOpacity
          style={styles.editSection}
          onPress={() => {
            const next = section === "equipes" ? null : "equipes";
            setSection(next);
            setError(""); setSuccess("");
            if (next === "equipes") loadEquipes();
          }}
        >
          <Text style={styles.editSectionTitle}>🎮 Mes équipes esport</Text>
          <Text style={styles.editSectionChevron}>{section === "equipes" ? "▲" : "▼"}</Text>
        </TouchableOpacity>

        {section === "equipes" && (
          <Card style={styles.editCard}>
            {error ? <Text style={styles.error}>{error}</Text> : null}

            {/* Équipes sélectionnées */}
            <Text style={styles.equipesHint}>
              {mesEquipes.length}/3 équipe{mesEquipes.length !== 1 ? "s" : ""} sélectionnée{mesEquipes.length !== 1 ? "s" : ""}
            </Text>
            {mesEquipes.length > 0 && (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
                {mesEquipes.map((e) => (
                  <TouchableOpacity
                    key={e.id}
                    style={[styles.equipeChipSelected, { borderColor: e.couleur, backgroundColor: e.couleur + "22" }]}
                    onPress={() => toggleEquipe(e)}
                  >
                    <View style={[styles.equipeChipDot, { backgroundColor: e.couleur }]} />
                    <Text style={[styles.equipeChipText, { color: e.couleur }]}>{e.nom}</Text>
                    <Text style={styles.equipeChipRemove}>✕</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}

            {/* Liste des équipes */}
            <View style={styles.equipesGrid}>
              {toutesEquipes.map((e) => {
                const selected = mesEquipes.some((s) => s.id === e.id);
                const logo = TEAM_LOGOS[e.nom];
                return (
                  <TouchableOpacity
                    key={e.id}
                    style={[
                      styles.equipeGridItem,
                      selected && { borderColor: e.couleur, borderWidth: 2, backgroundColor: e.couleur + "18" },
                      !selected && mesEquipes.length >= 3 && styles.equipeGridItemDisabled,
                    ]}
                    onPress={() => toggleEquipe(e)}
                    disabled={!selected && mesEquipes.length >= 3}
                  >
                    {logo ? (
                      <Image source={logo} style={styles.equipeGridLogo} resizeMode="contain" />
                    ) : (
                      <View style={[styles.equipeColorBar, { backgroundColor: e.couleur }]} />
                    )}
                    <Text style={[styles.equipeGridNom, selected && { color: e.couleur, fontWeight: "700" }]}>
                      {e.nom}
                    </Text>
                    {selected && <Text style={[styles.equipeGridCheck, { color: e.couleur }]}>✓</Text>}
                  </TouchableOpacity>
                );
              })}
            </View>

            <Button onPress={handleSaveEquipes} disabled={saving}>
              {saving ? "Enregistrement..." : "Enregistrer"}
            </Button>
          </Card>
        )}

        <View style={{ marginTop: 8, marginBottom: 24 }}>
          <Button onPress={onLogout} variant="danger">Se déconnecter</Button>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8fafc",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: "#ffffff",
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
  },
  headerBrand: {
    fontSize: 16,
    fontWeight: "800",
    color: "#0f172a",
    letterSpacing: 0.3,
    textAlign: "center",
    flex: 1,
  },
  headerLeft: {
    flexDirection: "column",
    alignItems: "flex-start",
    minWidth: 70,
  },
  headerRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    minWidth: 80,
    justifyContent: "flex-end",
  },
  headerIconBtn: {
    position: "relative",
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
  },
  headerIconEmoji: {
    fontSize: 22,
  },
  headerBadge: {
    position: "absolute",
    top: 0,
    right: 0,
    backgroundColor: "#dc2626",
    borderRadius: 8,
    minWidth: 16,
    height: 16,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 3,
  },
  headerBadgeText: {
    color: "#ffffff",
    fontSize: 10,
    fontWeight: "700",
  },
  headerAvatarBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    overflow: "hidden",
  },
  headerAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
  },
  headerAvatarFallback: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#2563eb",
    alignItems: "center",
    justifyContent: "center",
  },
  headerAvatarText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "700",
  },
  headerStat: {
    fontSize: 13,
    fontWeight: "600",
    color: "#475569",
  },
  content: {
    flex: 1,
  },
  tabBar: {
    flexDirection: "row",
    backgroundColor: "#ffffff",
    borderTopWidth: 1,
    borderTopColor: "#e2e8f0",
    paddingBottom: Platform.OS === "ios" ? 4 : 0,
  },
  tabBtn: {
    flex: 1,
    paddingVertical: 10,
    alignItems: "center",
  },
  tabBtnActive: {
    borderTopWidth: 2,
    borderTopColor: "#2563eb",
  },
  tabLabel: {
    fontSize: 10,
    fontWeight: "500",
    color: "#94a3b8",
  },
  tabLabelActive: {
    color: "#2563eb",
    fontWeight: "700",
  },
  // Shared screen styles
  screen: {
    flex: 1,
  },
  screenHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#ffffff",
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
  },
  screenTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#0f172a",
  },
  chatNav: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: "#f8fafc",
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
  },
  chatNavTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#0f172a",
  },
  enJeuBanner: {
    backgroundColor: "#fef3c7",
    paddingHorizontal: 16,
    paddingVertical: 6,
    alignItems: "center",
  },
  placeholder: {
    width: 70,
  },
  scroll: {
    flex: 1,
    padding: 16,
  },
  // Filter bar (statut)
  filterBar: {
    backgroundColor: "#ffffff",
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  filterBarContent: {
    gap: 8,
    alignItems: "center",
  },
  filterBtn: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#cbd5e1",
    backgroundColor: "#f8fafc",
  },
  filterBtnActive: {
    backgroundColor: "#2563eb",
    borderColor: "#2563eb",
  },
  filterBtnText: {
    fontSize: 13,
    color: "#475569",
    fontWeight: "500",
  },
  filterBtnTextActive: {
    color: "#ffffff",
  },
  // Category bar (sport/jeu)
  catBar: {
    flexDirection: "row",
    backgroundColor: "#f8fafc",
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
    paddingVertical: 8,
    paddingHorizontal: 8,
  },
  catBarContent: {},
  catBtn: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: "transparent",
    backgroundColor: "transparent",
  },
  catBtnActive: {
    backgroundColor: "#eff6ff",
    borderColor: "#2563eb",
  },
  catBtnIcon: {
    fontSize: 22,
    marginBottom: 2,
  },
  catBtnImage: {
    width: 28,
    height: 28,
    marginBottom: 2,
  },
  catBtnLabel: {
    fontSize: 10,
    fontWeight: "600",
    color: "#94a3b8",
  },
  catBtnLabelActive: {
    color: "#2563eb",
  },
  pronosticCatIcon: {
    fontSize: 18,
    marginRight: 6,
  },
  favoriteStarBadge: {
    position: "absolute",
    top: 8,
    right: 8,
    zIndex: 10,
  },
  favoriteStarText: {
    fontSize: 16,
  },
  teamsHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  teamBlock: {
    flex: 1,
    alignItems: "center",
  },
  teamLogo: {
    width: 56,
    height: 56,
    marginBottom: 4,
  },
  teamLogoPlaceholder: {
    width: 56,
    height: 56,
    marginBottom: 4,
    backgroundColor: "#e2e8f0",
    borderRadius: 28,
  },
  teamName: {
    fontSize: 12,
    fontWeight: "600",
    color: "#0f172a",
    textAlign: "center",
  },
  vsBlock: {
    alignItems: "center",
    paddingHorizontal: 8,
  },
  vsText: {
    fontSize: 16,
    fontWeight: "800",
    color: "#94a3b8",
    letterSpacing: 1,
  },
  tournoiText: {
    fontSize: 11,
    color: "#64748b",
    textAlign: "center",
    marginBottom: 6,
    fontStyle: "italic",
  },
  // Common
  error: {
    color: "#dc2626",
    fontSize: 13,
    marginBottom: 8,
  },
  empty: {
    textAlign: "center",
    color: "#94a3b8",
    marginTop: 24,
    fontSize: 14,
  },
  loader: {
    marginVertical: 16,
  },
  centerBtn: {
    alignItems: "center",
    marginVertical: 12,
  },
  section: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: "#0f172a",
    marginBottom: 10,
  },
  actions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 10,
  },
  input: {
    borderWidth: 1,
    borderColor: "#cbd5e1",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    backgroundColor: "#fff",
    marginBottom: 8,
  },
  // Card content
  pronosticHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  pronosticTitre: {
    fontSize: 15,
    fontWeight: "600",
    color: "#0f172a",
    flex: 1,
    marginRight: 8,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#ffffff",
  },
  prediction: {
    fontSize: 13,
    color: "#475569",
    fontStyle: "italic",
    marginBottom: 8,
  },
  pariDesc: {
    fontSize: 13,
    color: "#64748b",
    marginBottom: 6,
  },
  meta: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  metaText: {
    fontSize: 12,
    color: "#94a3b8",
  },
  coinsBadge: {
    fontSize: 15,
    fontWeight: "600",
    color: "#334155",
  },
  gemsBadge: {
    fontSize: 12,
    fontWeight: "500",
    color: "#7c3aed",
  },
  enJeuBadge: {
    fontSize: 11,
    color: "#f59e0b",
    fontWeight: "500",
  },
  betSuccess: {
    backgroundColor: "#dcfce7",
    borderRadius: 8,
    padding: 10,
    marginBottom: 10,
  },
  betSuccessText: {
    color: "#16a34a",
    fontSize: 13,
    fontWeight: "500",
  },
  betForm: {
    marginTop: 10,
    gap: 10,
    alignItems: "center",
  },
  betCostText: {
    fontSize: 12,
    color: "#92400e",
    fontWeight: "500",
    backgroundColor: "#fef9c3",
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    alignSelf: "center",
  },
  betMiseZone: {
    alignItems: "center",
    gap: 4,
  },
  betAdjustRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  betAdjBtn: {
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    backgroundColor: "#f8fafc",
  },
  betAdjBtnPlus: {
    backgroundColor: "#eff6ff",
    borderColor: "#bfdbfe",
  },
  betAdjBtnText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#dc2626",
  },
  betAdjBtnTextPlus: {
    color: "#2563eb",
  },
  betMiseInput: {
    width: 90,
    fontSize: 26,
    fontWeight: "800",
    color: "#0f172a",
    borderBottomWidth: 2,
    borderBottomColor: "#2563eb",
    paddingVertical: 4,
    textAlign: "center",
  },
  betMiseLabel: {
    fontSize: 12,
    color: "#94a3b8",
    fontWeight: "500",
  },
  parisFermeRow: {
    marginTop: 10,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: "#fef2f2",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#fecaca",
  },
  parisFermeText: {
    fontSize: 12,
    color: "#dc2626",
    fontWeight: "600",
    textAlign: "center",
  },
  sectionHeader: {
    marginTop: 16,
    marginBottom: 4,
    paddingHorizontal: 4,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#1e293b",
  },
  enDirectBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fee2e2",
    borderRadius: 6,
    paddingHorizontal: 7,
    paddingVertical: 3,
    marginLeft: 8,
  },
  enDirectDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: "#dc2626",
    marginRight: 5,
  },
  enDirectText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#dc2626",
    letterSpacing: 0.5,
  },
  dejaParieRow: {
    marginTop: 10,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: "#f0fdf4",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#bbf7d0",
  },
  dejaParieText: {
    fontSize: 13,
    color: "#16a34a",
    fontWeight: "600",
    textAlign: "center",
  },
  betButtonRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginTop: 10,
  },
  betGemHint: {
    fontSize: 13,
    color: "#7c3aed",
    fontWeight: "600",
  },
  // Communautés
  communauteHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  communauteNom: {
    fontSize: 15,
    fontWeight: "600",
    color: "#0f172a",
    flex: 1,
  },
  communauteMembres: {
    fontSize: 12,
    color: "#94a3b8",
  },
  communauteDesc: {
    fontSize: 13,
    color: "#64748b",
    marginBottom: 4,
  },
  jeuLabel: {
    fontSize: 14,
    fontWeight: "700",
    color: "#475569",
    marginBottom: 8,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  jeuTag: {
    fontSize: 12,
    color: "#94a3b8",
  },
  // Classement
  classementMe: {
    backgroundColor: "#eff6ff",
    borderColor: "#bfdbfe",
  },
  classementTopMe: {
    backgroundColor: "#fefce8",
    borderColor: "#fde68a",
  },
  classementSectionLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: "#94a3b8",
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: 8,
  },
  classementDivider: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 12,
    gap: 8,
  },
  classementDividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: "#e2e8f0",
  },
  classementDividerText: {
    fontSize: 12,
    color: "#94a3b8",
    fontWeight: "500",
  },
  classementItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  classementRang: {
    fontSize: 18,
    minWidth: 36,
  },
  classementInfo: {
    flex: 1,
  },
  classementPseudo: {
    fontSize: 15,
    fontWeight: "600",
    color: "#0f172a",
  },
  classementXp: {
    fontSize: 12,
    color: "#94a3b8",
  },
  classementCoins: {
    fontSize: 13,
    fontWeight: "500",
    color: "#475569",
  },
  meTag: {
    fontSize: 12,
    color: "#2563eb",
    fontWeight: "400",
  },
  // Chat
  chatMessages: {
    flex: 1,
    padding: 16,
  },
  bubbleRow: {
    marginBottom: 12,
  },
  bubbleRowMine: {
    alignItems: "flex-end",
  },
  bubbleRowOther: {
    alignItems: "flex-start",
  },
  bubbleAuthor: {
    fontSize: 12,
    color: "#2563eb",
    fontWeight: "600",
    marginBottom: 4,
  },
  bubble: {
    maxWidth: "80%",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
  },
  bubbleMine: {
    backgroundColor: "#2563eb",
    borderBottomRightRadius: 4,
  },
  bubbleOther: {
    backgroundColor: "#f1f5f9",
    borderBottomLeftRadius: 4,
  },
  bubbleText: {
    fontSize: 14,
  },
  bubbleTextMine: {
    color: "#ffffff",
  },
  bubbleTextOther: {
    color: "#0f172a",
  },
  bubbleTime: {
    fontSize: 11,
    color: "#94a3b8",
    marginTop: 2,
  },
  chatInputBar: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 8,
    padding: 12,
    backgroundColor: "#ffffff",
    borderTopWidth: 1,
    borderTopColor: "#e2e8f0",
  },
  chatInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#cbd5e1",
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
    fontSize: 14,
    maxHeight: 100,
    backgroundColor: "#f8fafc",
  },
  chatHeaderInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  chatAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#2563eb",
    alignItems: "center",
    justifyContent: "center",
  },
  chatAvatarText: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "700",
  },
  // Classement Modal
  classementModalCard: {
    backgroundColor: "#ffffff",
    borderRadius: 16,
    padding: 20,
    width: "90%",
    maxWidth: 400,
    maxHeight: "75%",
  },
  classementModalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 16,
  },
  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    alignItems: "center",
    justifyContent: "center",
  },
  modalCard: {
    backgroundColor: "#ffffff",
    borderRadius: 16,
    padding: 20,
    width: "85%",
    maxWidth: 360,
  },
  modalClose: {
    position: "absolute",
    top: 12,
    right: 12,
    padding: 4,
  },
  modalCloseText: {
    fontSize: 16,
    color: "#94a3b8",
  },
  // Profil
  profilInfo: {
    alignItems: "center",
    paddingBottom: 16,
    marginBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
  },
  profilAvatarWrapper: {
    width: 88,
    height: 88,
    marginBottom: 10,
    position: "relative",
  },
  profilAvatarImg: {
    width: 88,
    height: 88,
    borderRadius: 44,
    borderWidth: 3,
    borderColor: "#e2e8f0",
  },
  profilAvatar: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: "#2563eb",
    alignItems: "center",
    justifyContent: "center",
  },
  profilAvatarText: {
    color: "#ffffff",
    fontSize: 34,
    fontWeight: "700",
  },
  profilAvatarEditBadge: {
    position: "absolute",
    bottom: 0,
    right: 0,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#0f172a",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#ffffff",
  },
  profilAvatarEditIcon: {
    fontSize: 14,
  },
  profilPseudo: {
    fontSize: 20,
    fontWeight: "700",
    color: "#0f172a",
    marginBottom: 4,
  },
  profilEmail: {
    fontSize: 14,
    color: "#64748b",
    marginBottom: 4,
  },
  profilId: {
    fontSize: 12,
    color: "#94a3b8",
  },
  profilStats: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginBottom: 8,
  },
  stat: {
    alignItems: "center",
  },
  statValue: {
    fontSize: 22,
    fontWeight: "700",
    color: "#0f172a",
  },
  statLabel: {
    fontSize: 12,
    color: "#94a3b8",
    marginTop: 2,
  },
  profilEquipesRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginTop: 12,
    paddingTop: 12,
    paddingHorizontal: 8,
    borderTopWidth: 1,
    borderTopColor: "#f1f5f9",
  },
  profilEquipeItem: {
    flex: 1,
    alignItems: "center",
    gap: 6,
  },
  profilEquipeLogo: {
    width: 56,
    height: 56,
  },
  profilEquipeColorDot: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  profilEquipeNom: {
    fontSize: 11,
    fontWeight: "600",
    textAlign: "center",
    color: "#94a3b8",
  },
  // Amis
  searchRow: {
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
    marginBottom: 8,
  },
  userPreview: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: "#f1f5f9",
  },
  previewAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#2563eb",
    alignItems: "center",
    justifyContent: "center",
  },
  previewAvatarText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "700",
  },
  previewInfo: {
    flex: 1,
  },
  previewPseudo: {
    fontSize: 15,
    fontWeight: "600",
    color: "#0f172a",
  },
  previewMeta: {
    fontSize: 12,
    color: "#94a3b8",
  },
  sentLabel: {
    fontSize: 13,
    color: "#16a34a",
    fontWeight: "600",
  },
  friendItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  friendPseudo: {
    fontSize: 15,
    fontWeight: "600",
    color: "#0f172a",
  },
  friendMeta: {
    fontSize: 12,
    color: "#94a3b8",
    marginTop: 2,
  },
  label: {
    fontSize: 12,
    fontWeight: "600",
    color: "#94a3b8",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  successBox: {
    backgroundColor: "#dcfce7",
    borderRadius: 8,
    padding: 10,
    marginBottom: 10,
  },
  successText: {
    color: "#16a34a",
    fontSize: 13,
    fontWeight: "600",
  },
  editSection: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#ffffff",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginBottom: 8,
  },
  editSectionTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: "#0f172a",
  },
  editSectionChevron: {
    fontSize: 12,
    color: "#94a3b8",
  },
  editCard: {
    marginBottom: 8,
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: "#64748b",
    marginBottom: 4,
    marginTop: 4,
  },
  selectRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 8,
  },
  selectOption: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#cbd5e1",
    alignItems: "center",
    backgroundColor: "#f8fafc",
  },
  selectOptionActive: {
    backgroundColor: "#2563eb",
    borderColor: "#2563eb",
  },
  selectOptionText: {
    fontSize: 13,
    color: "#475569",
    fontWeight: "500",
  },
  selectOptionTextActive: {
    color: "#ffffff",
  },
  chipsScroll: {
    marginBottom: 10,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#cbd5e1",
    backgroundColor: "#f8fafc",
    marginRight: 8,
  },
  chipActive: {
    backgroundColor: "#2563eb",
    borderColor: "#2563eb",
  },
  chipText: {
    fontSize: 13,
    color: "#475569",
    fontWeight: "500",
  },
  chipTextActive: {
    color: "#ffffff",
  },
  // Boutique
  boutiqueHero: {
    backgroundColor: "#eff6ff",
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    alignItems: "center",
  },
  boutiqueHeroText: {
    fontSize: 18,
    fontWeight: "700",
    color: "#0f172a",
    marginBottom: 4,
  },
  boutiqueHeroSub: {
    fontSize: 13,
    color: "#64748b",
    textAlign: "center",
  },
  articleCard: {
    marginBottom: 8,
  },
  articleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  articleEmoji: {
    fontSize: 28,
    width: 40,
    textAlign: "center",
  },
  articleInfo: {
    flex: 1,
  },
  articleNom: {
    fontSize: 14,
    fontWeight: "600",
    color: "#0f172a",
    marginBottom: 2,
  },
  articleDesc: {
    fontSize: 12,
    color: "#64748b",
  },
  acheterBtn: {
    backgroundColor: "#2563eb",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    alignItems: "center",
    minWidth: 60,
  },
  acheterBtnPrix: {
    fontSize: 13,
    fontWeight: "700",
    color: "#ffffff",
  },
  acheterBtnLabel: {
    fontSize: 10,
    color: "#bfdbfe",
    marginTop: 1,
  },
  bientotBox: {
    alignItems: "center",
    paddingVertical: 20,
  },
  bientotText: {
    fontSize: 13,
    color: "#94a3b8",
  },
  // Alertes
  alerteBadge: {
    backgroundColor: "#dc2626",
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 2,
    minWidth: 24,
    alignItems: "center",
  },
  alerteBadgeText: {
    color: "#ffffff",
    fontSize: 13,
    fontWeight: "700",
  },
  alerteSectionTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#0f172a",
    marginBottom: 10,
  },
  alerteCard: {
    marginBottom: 8,
  },
  alerteRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 10,
  },
  alerteAvatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "#2563eb",
    alignItems: "center",
    justifyContent: "center",
  },
  alerteAvatarText: {
    color: "#ffffff",
    fontSize: 18,
    fontWeight: "700",
  },
  alerteInfo: {
    flex: 1,
  },
  alerteTitle: {
    fontSize: 14,
    color: "#0f172a",
  },
  alerteTime: {
    fontSize: 12,
    color: "#94a3b8",
    marginTop: 2,
  },
  alertesOverlay: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0,0,0,0.4)",
  },
  alertesDismiss: {
    flex: 1,
  },
  alertesSheet: {
    backgroundColor: "#ffffff",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: "75%",
    paddingBottom: Platform.OS === "ios" ? 24 : 16,
  },
  alertesSheetHandle: {
    width: 40,
    height: 4,
    backgroundColor: "#e2e8f0",
    borderRadius: 2,
    alignSelf: "center",
    marginTop: 12,
    marginBottom: 4,
  },
  alertesSheetHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
  },
  alertesSheetTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: "#0f172a",
  },
  alertesSheetClose: {
    fontSize: 18,
    color: "#94a3b8",
    paddingHorizontal: 4,
  },
  alerteVide: {
    alignItems: "center",
    paddingVertical: 60,
  },
  alerteVideEmoji: {
    fontSize: 48,
    marginBottom: 12,
  },
  alerteVideTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#0f172a",
    marginBottom: 6,
  },
  alerteVideSub: {
    fontSize: 14,
    color: "#94a3b8",
  },
  confirmOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    alignItems: "center",
    justifyContent: "center",
  },
  confirmCard: {
    backgroundColor: "#ffffff",
    borderRadius: 18,
    padding: 24,
    width: "80%",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 8,
  },
  confirmTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: "#0f172a",
    marginBottom: 10,
    textAlign: "center",
  },
  confirmMsg: {
    fontSize: 14,
    color: "#475569",
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 24,
  },
  confirmActions: {
    flexDirection: "row",
    gap: 10,
  },
  confirmBtnCancel: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#cbd5e1",
    alignItems: "center",
  },
  confirmBtnCancelText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#475569",
  },
  confirmBtnDelete: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: "#dc2626",
    alignItems: "center",
  },
  confirmBtnDeleteText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#ffffff",
  },
  equipesHint: {
    fontSize: 12,
    color: "#94a3b8",
    marginBottom: 8,
  },
  equipeChipSelected: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1.5,
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginRight: 8,
    gap: 5,
  },
  equipeChipDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  equipeChipText: {
    fontSize: 13,
    fontWeight: "600",
  },
  equipeChipRemove: {
    fontSize: 11,
    color: "#94a3b8",
    marginLeft: 2,
  },
  equipesGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 14,
  },
  equipeGridItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: "#e2e8f0",
    backgroundColor: "#f8fafc",
    gap: 8,
    minWidth: "45%",
    flex: 1,
  },
  equipeGridItemDisabled: {
    opacity: 0.35,
  },
  equipeColorBar: {
    width: 4,
    height: 24,
    borderRadius: 2,
  },
  equipeGridLogo: {
    width: 32,
    height: 32,
  },
  equipeGridNom: {
    flex: 1,
    fontSize: 13,
    color: "#0f172a",
    fontWeight: "500",
  },
  equipeGridCheck: {
    fontSize: 14,
    fontWeight: "700",
  },
  pwHint: {
    fontSize: 11,
    color: "#94a3b8",
    marginBottom: 10,
    lineHeight: 16,
  },
  commuTags: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  commuTag: {
    backgroundColor: "#eff6ff",
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  commuTagText: {
    fontSize: 12,
    color: "#2563eb",
    fontWeight: "500",
  },
  formCard: {
    marginBottom: 12,
  },
});
