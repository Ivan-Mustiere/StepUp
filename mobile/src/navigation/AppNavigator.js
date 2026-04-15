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
import { colors, fontSize, spacing, radius, shadow } from "../styles";
import { getRank, getNextRank, getRankProgress } from "../config/ranks";
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
  searchByFriendCode,
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
        p.deja_parie ? (
          <View style={styles.maMiseRow}>
            <Text style={styles.maMiseText}>✅ Mise placée : <Text style={styles.maMiseValue}>{p.ma_mise} 🪙</Text></Text>
            <Text style={styles.maMiseCote}>Cote : <Text style={styles.maMiseValue}>×{p.cote}</Text></Text>
          </View>
        ) : (
          <View style={styles.parisFermeRow}>
            <Text style={styles.parisFermeText}>🔒 Paris fermés — moins de 15 min avant le début</Text>
          </View>
        )
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
function ProfileModal({ user, currentUser, onClose, onFriendRemoved }) {
  const [requestState, setRequestState] = useState("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const [fullUser, setFullUser] = useState(user);
  const [confirmVisible, setConfirmVisible] = useState(false);
  const isSelf = currentUser?.id === user.id;

  useEffect(() => {
    getUserProfile(user.id)
      .then(setFullUser)
      .catch(() => {});
  }, [user.id]);

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

  async function doRemoveFriend() {
    try {
      await removeFriend(fullUser.id);
      setConfirmVisible(false);
      onFriendRemoved?.();
      onClose();
    } catch (err) {
      setConfirmVisible(false);
      setErrorMsg(err.message);
    }
  }

  return (
    <>
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={onClose}>
        <View style={styles.modalCard} onStartShouldSetResponder={() => true}>

          {!isSelf && (
            <TouchableOpacity
              style={styles.modalAddFriendBtn}
              onPress={fullUser.is_friend ? () => setConfirmVisible(true) : handleAskFriend}
              disabled={requestState === "loading"}
            >
              <Text style={styles.modalAddFriendIcon}>
                {fullUser.is_friend
                  ? "🗑️"
                  : requestState === "sent" ? "✓"
                  : requestState === "loading" ? "…"
                  : "🫂"}
              </Text>
            </TouchableOpacity>
          )}


          {(() => {
            const rank = getRank(fullUser.xp_total ?? 0);
            return (
              <View style={[styles.profilInfo, { borderBottomWidth: 0, marginBottom: 0, paddingBottom: 8 }]}>
                {/* Bannière rang — image elo en arrière-plan */}
                <View style={styles.profilBanner}>
                  <Image source={rank.image} style={styles.profilBannerImg} resizeMode="contain" />
                </View>
                {/* Avatar */}
                {fullUser.avatar ? (
                  <Image
                    source={{ uri: API_BASE_URL + fullUser.avatar }}
                    style={[styles.profilAvatarImg, { borderColor: rank.color }]}
                  />
                ) : (
                  <View style={[styles.profilAvatar, { backgroundColor: rank.color }]}>
                    <Text style={styles.profilAvatarText}>{fullUser.pseudo?.[0]?.toUpperCase()}</Text>
                  </View>
                )}
                <Text style={styles.profilPseudo}>{fullUser.pseudo}</Text>
                <View style={styles.rankBadge}>
                  <Image source={rank.image} style={styles.rankBadgeIcon} resizeMode="contain" />
                  <Text style={[styles.rankBadgeName, { color: rank.color }]}>{rank.name}</Text>
                </View>
                {requestState === "error" && <Text style={styles.error}>{errorMsg}</Text>}
              </View>
            );
          })()}

          {fullUser.communautes?.length > 0 && (
            <View style={{ marginTop: 12 }}>
              <Text style={styles.label}>Communautés</Text>
              <View style={styles.commuTags}>
                {fullUser.communautes.map((c) => (
                  <View key={c} style={styles.commuTag}>
                    <Text style={styles.commuTagText}>{c}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {fullUser.equipes?.length > 0 && (
            <View style={{ marginTop: 12 }}>
              <Text style={styles.label}>Équipes favorites</Text>
              <View style={styles.profilEquipesRow}>
                {fullUser.equipes.map((e) => {
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
            </View>
          )}
        </View>
      </TouchableOpacity>
    </Modal>

    {/* Modal confirmation suppression — par-dessus le ProfileModal */}
    <Modal visible={confirmVisible} transparent animationType="fade" onRequestClose={() => setConfirmVisible(false)}>
      <View style={styles.confirmOverlay}>
        <View style={styles.confirmCard}>
          <Text style={styles.confirmTitle}>Supprimer un ami</Text>
          <Text style={styles.confirmMsg}>
            Voulez-vous retirer{" "}
            <Text style={{ fontWeight: "700" }}>{fullUser.pseudo}</Text>{" "}
            de votre liste d'amis ?
          </Text>
          <View style={styles.confirmActions}>
            <TouchableOpacity style={styles.confirmBtnCancel} onPress={() => setConfirmVisible(false)}>
              <Text style={styles.confirmBtnCancelText}>Annuler</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.confirmBtnDelete} onPress={doRemoveFriend}>
              <Text style={styles.confirmBtnDeleteText}>Supprimer</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
    </>
  );
}

// --- Écran Amis ---
function AmisScreen({ currentUser }) {
  const [friends, setFriends] = useState([]);
  const [incoming, setIncoming] = useState([]);
  const [friendCode, setFriendCode] = useState("");
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

  useEffect(() => { loadData(); }, []);

  async function handleSearch() {
    if (!friendCode.trim()) return;
    setPreviewError("");
    setPreview(null);
    setRequestSent(false);
    setPreviewLoading(true);
    try {
      const user = await searchByFriendCode(friendCode.trim());
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
          onFriendRemoved={loadData}
        />
      )}


      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
        <Card>
          <Text style={styles.sectionTitle}>Ajouter un ami</Text>
          <View style={styles.searchRow}>
            <TextInput
              style={[styles.input, { flex: 1, marginBottom: 0 }]}
              placeholder="xxxx-xxxx-xxxx"
              autoCapitalize="none"
              autoCorrect={false}
              value={friendCode}
              onChangeText={(v) => {
                setFriendCode(v);
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
                </View>
              </Card>
            ))
          )}
        </View>
      </ScrollView>

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
  const [settingsVisible, setSettingsVisible] = useState(false);
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
        <Card style={{ position: "relative" }}>
          <TouchableOpacity style={styles.profilSettingsBtn} onPress={() => { setSection(null); setError(""); setSuccess(""); setSettingsVisible(true); }}>
            <Text style={styles.profilSettingsIcon}>⚙️</Text>
          </TouchableOpacity>

          {(() => {
            const rank = getRank(profile.xp_total ?? 0);
            return (
              <View style={styles.profilInfo}>
                {/* Bannière rang — image elo en arrière-plan */}
                <View style={styles.profilBanner}>
                  <Image source={rank.image} style={styles.profilBannerImg} resizeMode="contain" />
                </View>
                {/* Avatar par dessus la bannière */}
                <TouchableOpacity style={styles.profilAvatarWrapper} onPress={handlePickAvatar} disabled={avatarUploading}>
                  {profile.avatar ? (
                    <Image
                      source={{ uri: API_BASE_URL + profile.avatar }}
                      style={[styles.profilAvatarImg, { borderColor: rank.color }]}
                    />
                  ) : (
                    <View style={[styles.profilAvatar, { backgroundColor: rank.color }]}>
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
                {profile.friend_code && (
                  <TouchableOpacity
                    onPress={() => {
                      if (typeof navigator !== "undefined" && navigator.clipboard) {
                        navigator.clipboard.writeText(profile.friend_code);
                      }
                    }}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.profilFriendCode}>🔗 {profile.friend_code}</Text>
                  </TouchableOpacity>
                )}
              </View>
            );
          })()}

          <View style={styles.profilStats}>
            <View style={styles.stat}>
              <Text style={styles.statValue}>{profile.coins}</Text>
              <Text style={styles.statLabel}>Coins</Text>
            </View>
            <View style={styles.stat}>
              <Text style={styles.statValue}>{profile.xp_total}</Text>
              <Text style={styles.statLabel}>XP total</Text>
            </View>
          </View>

          {(() => {
            const rank = getRank(profile.xp_total ?? 0);
            const next = getNextRank(profile.xp_total ?? 0);
            const progress = getRankProgress(profile.xp_total ?? 0);
            return (
              <View style={styles.rankSection}>
                <View style={styles.rankRow}>
                  <Image source={rank.image} style={styles.rankIcon} resizeMode="contain" />
                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                      <Text style={[styles.rankName, { color: rank.color }]}>{rank.name}</Text>
                      {next && (
                        <Text style={styles.rankNextLabel}>
                          {next.minXp - (profile.xp_total ?? 0)} XP → {next.name}
                        </Text>
                      )}
                    </View>
                    <View style={styles.rankProgressBar}>
                      <View style={[styles.rankProgressFill, { width: `${Math.round(progress * 100)}%`, backgroundColor: rank.color }]} />
                    </View>
                  </View>
                </View>
                {rank.discount > 0 && (
                  <Text style={styles.rankPerk}>🏷️ -{rank.discount}% en boutique</Text>
                )}
              </View>
            );
          })()}

          {mesEquipes.length > 0 && (
            <View style={[styles.profilEquipesRow, { borderTopWidth: 1, borderTopColor: "#f1f5f9", paddingTop: 12 }]}>
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

        <View style={{ marginTop: 8, marginBottom: 24 }}>
          <Button onPress={onLogout} variant="danger">Se déconnecter</Button>
        </View>
      </ScrollView>

      {/* Modal Paramètres */}
      <Modal visible={settingsVisible} animationType="slide" onRequestClose={() => setSettingsVisible(false)}>
        <View style={styles.screen}>
          <View style={styles.settingsHeader}>
            <Text style={styles.settingsTitle}>Paramètres</Text>
            <TouchableOpacity onPress={() => setSettingsVisible(false)} style={styles.settingsClose}>
              <Text style={styles.settingsCloseText}>✕</Text>
            </TouchableOpacity>
          </View>
          <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
            {success ? <View style={styles.successBox}><Text style={styles.successText}>✓ {success}</Text></View> : null}

            {/* Modifier les infos */}
            <TouchableOpacity style={styles.editSection} onPress={() => { setSection(section === "infos" ? null : "infos"); setError(""); setSuccess(""); }}>
              <Text style={styles.editSectionTitle}>✏️ Modifier le profil</Text>
              <Text style={styles.editSectionChevron}>{section === "infos" ? "▲" : "▼"}</Text>
            </TouchableOpacity>
            {section === "infos" && (
              <Card style={styles.editCard}>
                {error ? <Text style={styles.error}>{error}</Text> : null}
                <Text style={styles.fieldLabel}>Pseudo</Text>
                <TextInput style={styles.input} value={form.pseudo} onChangeText={(v) => setForm((p) => ({ ...p, pseudo: v }))} autoCapitalize="none" />
                <Text style={styles.fieldLabel}>Age</Text>
                <TextInput style={styles.input} value={form.age} onChangeText={(v) => setForm((p) => ({ ...p, age: v }))} keyboardType="number-pad" placeholder="Non renseigné" />
                <Text style={styles.fieldLabel}>Genre</Text>
                <View style={styles.selectRow}>
                  {GENRES.map((g) => (
                    <TouchableOpacity key={g} style={[styles.selectOption, form.genre === g && styles.selectOptionActive]} onPress={() => setForm((p) => ({ ...p, genre: g }))}>
                      <Text style={[styles.selectOptionText, form.genre === g && styles.selectOptionTextActive]}>{g.charAt(0).toUpperCase() + g.slice(1)}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
                <Text style={styles.fieldLabel}>Pays</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipsScroll}>
                  {PAYS.map(({ label, flag }) => (
                    <TouchableOpacity key={label} style={[styles.chip, form.pays === label && styles.chipActive]} onPress={() => setForm((prev) => ({ ...prev, pays: label, region: "" }))}>
                      <Text style={[styles.chipText, form.pays === label && styles.chipTextActive]}>{label} {flag}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
                {form.pays && REGIONS_BY_PAYS[form.pays] && (
                  <>
                    <Text style={styles.fieldLabel}>Région</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipsScroll}>
                      {REGIONS_BY_PAYS[form.pays].map((r) => (
                        <TouchableOpacity key={r} style={[styles.chip, form.region === r && styles.chipActive]} onPress={() => setForm((prev) => ({ ...prev, region: r }))}>
                          <Text style={[styles.chipText, form.region === r && styles.chipTextActive]}>{r}</Text>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  </>
                )}
                <Button onPress={handleSaveInfos} disabled={saving}>{saving ? "Sauvegarde..." : "Enregistrer"}</Button>
              </Card>
            )}

            {/* Changer le mot de passe */}
            <TouchableOpacity style={styles.editSection} onPress={() => { setSection(section === "password" ? null : "password"); setError(""); setSuccess(""); }}>
              <Text style={styles.editSectionTitle}>🔒 Changer le mot de passe</Text>
              <Text style={styles.editSectionChevron}>{section === "password" ? "▲" : "▼"}</Text>
            </TouchableOpacity>
            {section === "password" && (
              <Card style={styles.editCard}>
                {error ? <Text style={styles.error}>{error}</Text> : null}
                <Text style={styles.fieldLabel}>Mot de passe actuel</Text>
                <TextInput style={styles.input} value={pwForm.current} onChangeText={(v) => setPwForm((p) => ({ ...p, current: v }))} secureTextEntry placeholder="••••••••" />
                <Text style={styles.fieldLabel}>Nouveau mot de passe</Text>
                <TextInput style={styles.input} value={pwForm.next} onChangeText={(v) => setPwForm((p) => ({ ...p, next: v }))} secureTextEntry placeholder="••••••••" />
                <Text style={styles.fieldLabel}>Confirmer le nouveau mot de passe</Text>
                <TextInput style={styles.input} value={pwForm.confirm} onChangeText={(v) => setPwForm((p) => ({ ...p, confirm: v }))} secureTextEntry placeholder="••••••••" />
                <Text style={styles.pwHint}>Doit contenir : majuscule, minuscule, chiffre et caractère spécial (min. 8 caractères)</Text>
                <Button onPress={handleChangePassword} disabled={saving}>{saving ? "Modification..." : "Changer le mot de passe"}</Button>
              </Card>
            )}

            {/* Équipes esport */}
            <TouchableOpacity style={styles.editSection} onPress={() => { const next = section === "equipes" ? null : "equipes"; setSection(next); setError(""); setSuccess(""); if (next === "equipes") loadEquipes(); }}>
              <Text style={styles.editSectionTitle}>🎮 Mes équipes esport</Text>
              <Text style={styles.editSectionChevron}>{section === "equipes" ? "▲" : "▼"}</Text>
            </TouchableOpacity>
            {section === "equipes" && (
              <Card style={styles.editCard}>
                {error ? <Text style={styles.error}>{error}</Text> : null}
                <Text style={styles.equipesHint}>{mesEquipes.length}/3 équipe{mesEquipes.length !== 1 ? "s" : ""} sélectionnée{mesEquipes.length !== 1 ? "s" : ""}</Text>
                {mesEquipes.length > 0 && (
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
                    {mesEquipes.map((e) => (
                      <TouchableOpacity key={e.id} style={[styles.equipeChipSelected, { borderColor: e.couleur, backgroundColor: e.couleur + "22" }]} onPress={() => toggleEquipe(e)}>
                        <View style={[styles.equipeChipDot, { backgroundColor: e.couleur }]} />
                        <Text style={[styles.equipeChipText, { color: e.couleur }]}>{e.nom}</Text>
                        <Text style={styles.equipeChipRemove}>✕</Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                )}
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
                        <Text style={[styles.equipeGridNom, selected && { color: e.couleur, fontWeight: "700" }]}>{e.nom}</Text>
                        {selected && <Text style={[styles.equipeGridCheck, { color: e.couleur }]}>✓</Text>}
                      </TouchableOpacity>
                    );
                  })}
                </View>
                <Button onPress={handleSaveEquipes} disabled={saving}>{saving ? "Enregistrement..." : "Enregistrer"}</Button>
              </Card>
            )}

            <View style={{ height: 32 }} />
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bgLight,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.xl,
    paddingVertical: 10,
    backgroundColor: colors.bgWhite,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  headerBrand: {
    fontSize: fontSize.xl,
    fontWeight: "800",
    color: colors.textPrimary,
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
    gap: spacing.sm,
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
    fontSize: fontSize.xl4,
  },
  headerBadge: {
    position: "absolute",
    top: 0,
    right: 0,
    backgroundColor: colors.error,
    borderRadius: radius.sm,
    minWidth: 16,
    height: 16,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 3,
  },
  headerBadgeText: {
    color: colors.white,
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
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  headerAvatarText: {
    color: colors.white,
    fontSize: fontSize.xl,
    fontWeight: "700",
  },
  headerStat: {
    fontSize: fontSize.md,
    fontWeight: "600",
    color: colors.textMuted,
  },
  content: {
    flex: 1,
  },
  tabBar: {
    flexDirection: "row",
    backgroundColor: colors.bgWhite,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
    paddingBottom: Platform.OS === "ios" ? 4 : 0,
  },
  tabBtn: {
    flex: 1,
    paddingVertical: 10,
    alignItems: "center",
  },
  tabBtnActive: {
    borderTopWidth: 2,
    borderTopColor: colors.primary,
  },
  tabLabel: {
    fontSize: 10,
    fontWeight: "500",
    color: colors.textPlaceholder,
  },
  tabLabelActive: {
    color: colors.primary,
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
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    backgroundColor: colors.bgWhite,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  screenTitle: {
    fontSize: fontSize.xl2,
    fontWeight: "700",
    color: colors.textPrimary,
  },
  chatNav: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.bgLight,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  chatNavTitle: {
    fontSize: fontSize.lg,
    fontWeight: "700",
    color: colors.textPrimary,
  },
  enJeuBanner: {
    backgroundColor: "#fef3c7",
    paddingHorizontal: spacing.xl,
    paddingVertical: 6,
    alignItems: "center",
  },
  placeholder: {
    width: 70,
  },
  scroll: {
    flex: 1,
    padding: spacing.xl,
  },
  // Filter bar (statut)
  filterBar: {
    backgroundColor: colors.bgWhite,
    borderBottomWidth: 1,
    borderBottomColor: colors.bgSubtle,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  filterBarContent: {
    gap: spacing.sm,
    alignItems: "center",
  },
  filterBtn: {
    paddingHorizontal: spacing.lg,
    paddingVertical: 6,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.borderMedium,
    backgroundColor: colors.bgLight,
  },
  filterBtnActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  filterBtnText: {
    fontSize: fontSize.md,
    color: colors.textMuted,
    fontWeight: "500",
  },
  filterBtnTextActive: {
    color: colors.white,
  },
  // Category bar (sport/jeu)
  catBar: {
    flexDirection: "row",
    backgroundColor: colors.bgLight,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
  },
  catBarContent: {},
  catBtn: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 6,
    borderRadius: radius.lg,
    borderWidth: 1.5,
    borderColor: colors.transparent,
    backgroundColor: colors.transparent,
  },
  catBtnActive: {
    backgroundColor: colors.primaryLight,
    borderColor: colors.primary,
  },
  catBtnIcon: {
    fontSize: fontSize.xl4,
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
    color: colors.textPlaceholder,
  },
  catBtnLabelActive: {
    color: colors.primary,
  },
  pronosticCatIcon: {
    fontSize: fontSize.xl2,
    marginRight: 6,
  },
  favoriteStarBadge: {
    position: "absolute",
    top: spacing.sm,
    right: spacing.sm,
    zIndex: 10,
  },
  favoriteStarText: {
    fontSize: fontSize.xl,
  },
  teamsHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: spacing.sm,
  },
  teamBlock: {
    flex: 1,
    alignItems: "center",
  },
  teamLogo: {
    width: 56,
    height: 56,
    marginBottom: spacing.xs,
  },
  teamLogoPlaceholder: {
    width: 56,
    height: 56,
    marginBottom: spacing.xs,
    backgroundColor: colors.borderLight,
    borderRadius: 28,
  },
  teamName: {
    fontSize: fontSize.sm,
    fontWeight: "600",
    color: colors.textPrimary,
    textAlign: "center",
  },
  vsBlock: {
    alignItems: "center",
    paddingHorizontal: spacing.sm,
  },
  vsText: {
    fontSize: fontSize.xl,
    fontWeight: "800",
    color: colors.textPlaceholder,
    letterSpacing: 1,
  },
  tournoiText: {
    fontSize: fontSize.xs,
    color: colors.textSubtle,
    textAlign: "center",
    marginBottom: 6,
    fontStyle: "italic",
  },
  // Common
  error: {
    color: colors.error,
    fontSize: fontSize.md,
    marginBottom: spacing.sm,
  },
  empty: {
    textAlign: "center",
    color: colors.textPlaceholder,
    marginTop: spacing.xl3,
    fontSize: fontSize.base,
  },
  loader: {
    marginVertical: spacing.xl,
  },
  centerBtn: {
    alignItems: "center",
    marginVertical: spacing.md,
  },
  section: {
    marginBottom: spacing.xl,
  },
  sectionTitle: {
    fontSize: fontSize.lg,
    fontWeight: "600",
    color: colors.textPrimary,
    marginBottom: 10,
  },
  actions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
    marginTop: 10,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.borderMedium,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    fontSize: fontSize.base,
    backgroundColor: colors.bgWhite,
    marginBottom: spacing.sm,
  },
  // Card content
  pronosticHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  pronosticTitre: {
    fontSize: fontSize.lg,
    fontWeight: "600",
    color: colors.textPrimary,
    flex: 1,
    marginRight: spacing.sm,
  },
  badge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: radius.lg,
  },
  badgeText: {
    fontSize: fontSize.xs,
    fontWeight: "600",
    color: colors.white,
  },
  prediction: {
    fontSize: fontSize.md,
    color: colors.textMuted,
    fontStyle: "italic",
    marginBottom: spacing.sm,
  },
  pariDesc: {
    fontSize: fontSize.md,
    color: colors.textSubtle,
    marginBottom: 6,
  },
  meta: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  metaText: {
    fontSize: fontSize.sm,
    color: colors.textPlaceholder,
  },
  coinsBadge: {
    fontSize: fontSize.lg,
    fontWeight: "600",
    color: colors.textSecondary,
  },
  gemsBadge: {
    fontSize: fontSize.sm,
    fontWeight: "500",
    color: "#7c3aed",
  },
  enJeuBadge: {
    fontSize: fontSize.xs,
    color: colors.warning,
    fontWeight: "500",
  },
  betSuccess: {
    backgroundColor: "#dcfce7",
    borderRadius: radius.sm,
    padding: 10,
    marginBottom: 10,
  },
  betSuccessText: {
    color: colors.success,
    fontSize: fontSize.md,
    fontWeight: "500",
  },
  betForm: {
    marginTop: 10,
    gap: 10,
    alignItems: "center",
  },
  betCostText: {
    fontSize: fontSize.sm,
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
    gap: spacing.xs,
  },
  betAdjustRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  betAdjBtn: {
    paddingHorizontal: 10,
    paddingVertical: spacing.sm,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.borderLight,
    backgroundColor: colors.bgLight,
  },
  betAdjBtnPlus: {
    backgroundColor: colors.primaryLight,
    borderColor: "#bfdbfe",
  },
  betAdjBtnText: {
    fontSize: fontSize.md,
    fontWeight: "700",
    color: colors.error,
  },
  betAdjBtnTextPlus: {
    color: colors.primary,
  },
  betMiseInput: {
    width: 90,
    fontSize: 26,
    fontWeight: "800",
    color: colors.textPrimary,
    borderBottomWidth: 2,
    borderBottomColor: colors.primary,
    paddingVertical: spacing.xs,
    textAlign: "center",
  },
  betMiseLabel: {
    fontSize: fontSize.sm,
    color: colors.textPlaceholder,
    fontWeight: "500",
  },
  parisFermeRow: {
    marginTop: 10,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    backgroundColor: "#fef2f2",
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: "#fecaca",
  },
  parisFermeText: {
    fontSize: fontSize.sm,
    color: colors.error,
    fontWeight: "600",
    textAlign: "center",
  },
  maMiseRow: {
    marginTop: 10,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.successBg,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.successBorder,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  maMiseText: {
    fontSize: fontSize.md,
    color: "#15803d",
  },
  maMiseCote: {
    fontSize: fontSize.md,
    color: "#15803d",
  },
  maMiseValue: {
    fontWeight: "700",
  },
  sectionHeader: {
    marginTop: spacing.xl,
    marginBottom: spacing.xs,
    paddingHorizontal: spacing.xs,
  },
  sectionTitle: {
    fontSize: fontSize.lg,
    fontWeight: "700",
    color: "#1e293b",
  },
  enDirectBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.errorBg,
    borderRadius: 6,
    paddingHorizontal: 7,
    paddingVertical: 3,
    marginLeft: spacing.sm,
  },
  enDirectDot: {
    width: 7,
    height: 7,
    borderRadius: radius.xs,
    backgroundColor: colors.error,
    marginRight: 5,
  },
  enDirectText: {
    fontSize: fontSize.xs,
    fontWeight: "700",
    color: colors.error,
    letterSpacing: 0.5,
  },
  dejaParieRow: {
    marginTop: 10,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.successBg,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.successBorder,
  },
  dejaParieText: {
    fontSize: fontSize.md,
    color: colors.success,
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
    fontSize: fontSize.md,
    color: "#7c3aed",
    fontWeight: "600",
  },
  // Communautés
  communauteHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: spacing.xs,
  },
  communauteNom: {
    fontSize: fontSize.lg,
    fontWeight: "600",
    color: colors.textPrimary,
    flex: 1,
  },
  communauteMembres: {
    fontSize: fontSize.sm,
    color: colors.textPlaceholder,
  },
  communauteDesc: {
    fontSize: fontSize.md,
    color: colors.textSubtle,
    marginBottom: spacing.xs,
  },
  jeuLabel: {
    fontSize: fontSize.base,
    fontWeight: "700",
    color: colors.textMuted,
    marginBottom: spacing.sm,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  jeuTag: {
    fontSize: fontSize.sm,
    color: colors.textPlaceholder,
  },
  // Classement
  classementMe: {
    backgroundColor: colors.primaryLight,
    borderColor: "#bfdbfe",
  },
  classementTopMe: {
    backgroundColor: "#fefce8",
    borderColor: "#fde68a",
  },
  classementSectionLabel: {
    fontSize: fontSize.xs,
    fontWeight: "700",
    color: colors.textPlaceholder,
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: spacing.sm,
  },
  classementDivider: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: spacing.md,
    gap: spacing.sm,
  },
  classementDividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: colors.borderLight,
  },
  classementDividerText: {
    fontSize: fontSize.sm,
    color: colors.textPlaceholder,
    fontWeight: "500",
  },
  classementItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  classementRang: {
    fontSize: fontSize.xl2,
    minWidth: 36,
  },
  classementInfo: {
    flex: 1,
  },
  classementPseudo: {
    fontSize: fontSize.lg,
    fontWeight: "600",
    color: colors.textPrimary,
  },
  classementXp: {
    fontSize: fontSize.sm,
    color: colors.textPlaceholder,
  },
  classementCoins: {
    fontSize: fontSize.md,
    fontWeight: "500",
    color: colors.textMuted,
  },
  meTag: {
    fontSize: fontSize.sm,
    color: colors.primary,
    fontWeight: "400",
  },
  // Chat
  chatMessages: {
    flex: 1,
    padding: spacing.xl,
  },
  bubbleRow: {
    marginBottom: spacing.md,
  },
  bubbleRowMine: {
    alignItems: "flex-end",
  },
  bubbleRowOther: {
    alignItems: "flex-start",
  },
  bubbleAuthor: {
    fontSize: fontSize.sm,
    color: colors.primary,
    fontWeight: "600",
    marginBottom: spacing.xs,
  },
  bubble: {
    maxWidth: "80%",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 16,
  },
  bubbleMine: {
    backgroundColor: colors.primary,
    borderBottomRightRadius: spacing.xs,
  },
  bubbleOther: {
    backgroundColor: colors.bgSubtle,
    borderBottomLeftRadius: spacing.xs,
  },
  bubbleText: {
    fontSize: fontSize.base,
  },
  bubbleTextMine: {
    color: colors.white,
  },
  bubbleTextOther: {
    color: colors.textPrimary,
  },
  bubbleTime: {
    fontSize: fontSize.xs,
    color: colors.textPlaceholder,
    marginTop: 2,
  },
  chatInputBar: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: spacing.sm,
    padding: spacing.md,
    backgroundColor: colors.bgWhite,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
  },
  chatInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.borderMedium,
    borderRadius: radius.full,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    fontSize: fontSize.base,
    maxHeight: 100,
    backgroundColor: colors.bgLight,
  },
  chatHeaderInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  chatAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  chatAvatarText: {
    color: colors.white,
    fontSize: fontSize.base,
    fontWeight: "700",
  },
  // Classement Modal
  classementModalCard: {
    backgroundColor: colors.bgWhite,
    borderRadius: radius.xl,
    padding: 20,
    width: "90%",
    maxWidth: 400,
    maxHeight: "75%",
  },
  classementModalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: spacing.xl,
  },
  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    alignItems: "center",
    justifyContent: "center",
  },
  modalCard: {
    backgroundColor: colors.bgWhite,
    borderRadius: radius.xl,
    padding: 20,
    width: "85%",
    maxWidth: 360,
  },
  modalAddFriendBtn: {
    position: "absolute",
    top: spacing.md,
    right: spacing.md,
    zIndex: 1,
  },
  modalAddFriendIcon: {
    fontSize: 24,
  },
  // Profil
  profilInfo: {
    alignItems: "center",
    paddingBottom: spacing.xl,
    marginBottom: spacing.xl,
    borderBottomWidth: 1,
    borderBottomColor: colors.bgSubtle,
    overflow: "hidden",
  },
  profilBanner: {
    width: "100%",
    height: 120,
    marginBottom: -44,
    opacity: 0.3,
  },
  profilBannerImg: {
    width: "100%",
    height: "100%",
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
    borderColor: colors.borderLight,
  },
  profilAvatar: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  profilAvatarText: {
    color: colors.white,
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
    backgroundColor: colors.textPrimary,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: colors.white,
  },
  profilAvatarEditIcon: {
    fontSize: fontSize.base,
  },
  profilPseudo: {
    fontSize: fontSize.xl3,
    fontWeight: "700",
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  profilEmail: {
    fontSize: fontSize.base,
    color: colors.textSubtle,
    marginBottom: spacing.xs,
  },
  profilSettingsBtn: {
    position: "absolute",
    top: spacing.sm,
    right: spacing.sm,
    zIndex: 1,
    padding: 6,
  },
  profilSettingsIcon: {
    fontSize: fontSize.xl4,
  },
  settingsHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.lg,
    backgroundColor: colors.bgWhite,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  settingsTitle: {
    fontSize: fontSize.xl2,
    fontWeight: "700",
    color: colors.textPrimary,
  },
  settingsClose: {
    padding: spacing.xs,
  },
  settingsCloseText: {
    fontSize: fontSize.xl2,
    color: colors.textPlaceholder,
  },
  profilFriendCode: {
    fontSize: fontSize.md,
    color: colors.primary,
    fontWeight: "600",
    letterSpacing: 1,
    marginTop: spacing.xs,
    paddingHorizontal: 10,
    paddingVertical: spacing.xs,
    backgroundColor: colors.primaryLight,
    borderRadius: radius.sm,
    overflow: "hidden",
  },
  profilId: {
    fontSize: fontSize.sm,
    color: colors.textPlaceholder,
  },
  profilStats: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginBottom: spacing.sm,
  },
  stat: {
    alignItems: "center",
  },
  statValue: {
    fontSize: fontSize.xl4,
    fontWeight: "700",
    color: colors.textPrimary,
  },
  statLabel: {
    fontSize: fontSize.sm,
    color: colors.textPlaceholder,
    marginTop: 2,
  },
  rankBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    marginTop: spacing.xs,
  },
  rankBadgeIcon: {
    width: 22,
    height: 22,
  },
  rankBadgeName: {
    fontSize: fontSize.md,
    fontWeight: "700",
  },
  rankSection: {
    marginHorizontal: spacing.xs,
    marginBottom: spacing.sm,
    backgroundColor: colors.bgLight,
    borderRadius: radius.lg,
    padding: spacing.md,
  },
  rankRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  rankIcon: {
    width: 40,
    height: 40,
  },
  rankName: {
    fontSize: fontSize.lg,
    fontWeight: "700",
  },
  rankNextLabel: {
    fontSize: fontSize.xs,
    color: colors.textPlaceholder,
  },
  rankProgressBar: {
    height: 6,
    backgroundColor: colors.borderLight,
    borderRadius: 3,
    marginTop: 6,
    overflow: "hidden",
  },
  rankProgressFill: {
    height: "100%",
    borderRadius: 3,
  },
  rankPerk: {
    marginTop: spacing.sm,
    fontSize: fontSize.sm,
    color: colors.textSubtle,
  },
  profilEquipesRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginTop: spacing.md,
    paddingHorizontal: spacing.sm,
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
    fontSize: fontSize.xs,
    fontWeight: "600",
    textAlign: "center",
    color: colors.textPlaceholder,
  },
  // Amis
  searchRow: {
    flexDirection: "row",
    gap: spacing.sm,
    alignItems: "center",
    marginBottom: spacing.sm,
  },
  userPreview: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: colors.bgSubtle,
  },
  previewAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  previewAvatarText: {
    color: colors.white,
    fontSize: fontSize.xl,
    fontWeight: "700",
  },
  previewInfo: {
    flex: 1,
  },
  previewPseudo: {
    fontSize: fontSize.lg,
    fontWeight: "600",
    color: colors.textPrimary,
  },
  previewMeta: {
    fontSize: fontSize.sm,
    color: colors.textPlaceholder,
  },
  sentLabel: {
    fontSize: fontSize.md,
    color: colors.success,
    fontWeight: "600",
  },
  friendItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.sm,
  },
  friendPseudo: {
    fontSize: fontSize.lg,
    fontWeight: "600",
    color: colors.textPrimary,
  },
  friendMeta: {
    fontSize: fontSize.sm,
    color: colors.textPlaceholder,
    marginTop: 2,
  },
  label: {
    fontSize: fontSize.sm,
    fontWeight: "600",
    color: colors.textPlaceholder,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  successBox: {
    backgroundColor: "#dcfce7",
    borderRadius: radius.sm,
    padding: 10,
    marginBottom: 10,
  },
  successText: {
    color: colors.success,
    fontSize: fontSize.md,
    fontWeight: "600",
  },
  editSection: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: colors.bgWhite,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.borderLight,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.lg,
    marginBottom: spacing.sm,
  },
  editSectionTitle: {
    fontSize: fontSize.lg,
    fontWeight: "600",
    color: colors.textPrimary,
  },
  editSectionChevron: {
    fontSize: fontSize.sm,
    color: colors.textPlaceholder,
  },
  editCard: {
    marginBottom: spacing.sm,
  },
  fieldLabel: {
    fontSize: fontSize.sm,
    fontWeight: "600",
    color: colors.textSubtle,
    marginBottom: spacing.xs,
    marginTop: spacing.xs,
  },
  selectRow: {
    flexDirection: "row",
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  selectOption: {
    flex: 1,
    paddingVertical: spacing.sm,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.borderMedium,
    alignItems: "center",
    backgroundColor: colors.bgLight,
  },
  selectOptionActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  selectOptionText: {
    fontSize: fontSize.md,
    color: colors.textMuted,
    fontWeight: "500",
  },
  selectOptionTextActive: {
    color: colors.white,
  },
  chipsScroll: {
    marginBottom: 10,
  },
  chip: {
    paddingHorizontal: spacing.lg,
    paddingVertical: 7,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.borderMedium,
    backgroundColor: colors.bgLight,
    marginRight: spacing.sm,
  },
  chipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  chipText: {
    fontSize: fontSize.md,
    color: colors.textMuted,
    fontWeight: "500",
  },
  chipTextActive: {
    color: colors.white,
  },
  // Boutique
  boutiqueHero: {
    backgroundColor: colors.primaryLight,
    borderRadius: radius.lg,
    padding: spacing.xl,
    marginBottom: spacing.xl,
    alignItems: "center",
  },
  boutiqueHeroText: {
    fontSize: fontSize.xl2,
    fontWeight: "700",
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  boutiqueHeroSub: {
    fontSize: fontSize.md,
    color: colors.textSubtle,
    textAlign: "center",
  },
  articleCard: {
    marginBottom: spacing.sm,
  },
  articleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
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
    fontSize: fontSize.base,
    fontWeight: "600",
    color: colors.textPrimary,
    marginBottom: 2,
  },
  articleDesc: {
    fontSize: fontSize.sm,
    color: colors.textSubtle,
  },
  acheterBtn: {
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    alignItems: "center",
    minWidth: 60,
  },
  acheterBtnPrix: {
    fontSize: fontSize.md,
    fontWeight: "700",
    color: colors.white,
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
    fontSize: fontSize.md,
    color: colors.textPlaceholder,
  },
  // Alertes
  alerteBadge: {
    backgroundColor: colors.error,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    minWidth: 24,
    alignItems: "center",
  },
  alerteBadgeText: {
    color: colors.white,
    fontSize: fontSize.md,
    fontWeight: "700",
  },
  alerteSectionTitle: {
    fontSize: fontSize.base,
    fontWeight: "700",
    color: colors.textPrimary,
    marginBottom: 10,
  },
  alerteCard: {
    marginBottom: spacing.sm,
  },
  alerteRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    marginBottom: 10,
  },
  alerteAvatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  alerteAvatarText: {
    color: colors.white,
    fontSize: fontSize.xl2,
    fontWeight: "700",
  },
  alerteInfo: {
    flex: 1,
  },
  alerteTitle: {
    fontSize: fontSize.base,
    color: colors.textPrimary,
  },
  alerteTime: {
    fontSize: fontSize.sm,
    color: colors.textPlaceholder,
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
    backgroundColor: colors.bgWhite,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: "75%",
    paddingBottom: Platform.OS === "ios" ? 24 : spacing.xl,
  },
  alertesSheetHandle: {
    width: 40,
    height: 4,
    backgroundColor: colors.borderLight,
    borderRadius: 2,
    alignSelf: "center",
    marginTop: spacing.md,
    marginBottom: spacing.xs,
  },
  alertesSheetHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.bgSubtle,
  },
  alertesSheetTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: colors.textPrimary,
  },
  alertesSheetClose: {
    fontSize: fontSize.xl2,
    color: colors.textPlaceholder,
    paddingHorizontal: spacing.xs,
  },
  alerteVide: {
    alignItems: "center",
    paddingVertical: 60,
  },
  alerteVideEmoji: {
    fontSize: 48,
    marginBottom: spacing.md,
  },
  alerteVideTitle: {
    fontSize: fontSize.xl2,
    fontWeight: "700",
    color: colors.textPrimary,
    marginBottom: 6,
  },
  alerteVideSub: {
    fontSize: fontSize.base,
    color: colors.textPlaceholder,
  },
  confirmOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    alignItems: "center",
    justifyContent: "center",
  },
  confirmCard: {
    backgroundColor: colors.bgWhite,
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
    color: colors.textPrimary,
    marginBottom: 10,
    textAlign: "center",
  },
  confirmMsg: {
    fontSize: fontSize.base,
    color: colors.textMuted,
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
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.borderMedium,
    alignItems: "center",
  },
  confirmBtnCancelText: {
    fontSize: fontSize.base,
    fontWeight: "600",
    color: colors.textMuted,
  },
  confirmBtnDelete: {
    flex: 1,
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.error,
    alignItems: "center",
  },
  confirmBtnDeleteText: {
    fontSize: fontSize.base,
    fontWeight: "700",
    color: colors.white,
  },
  equipesHint: {
    fontSize: fontSize.sm,
    color: colors.textPlaceholder,
    marginBottom: spacing.sm,
  },
  equipeChipSelected: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1.5,
    borderRadius: radius.full,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginRight: spacing.sm,
    gap: 5,
  },
  equipeChipDot: {
    width: 8,
    height: 8,
    borderRadius: radius.xs,
  },
  equipeChipText: {
    fontSize: fontSize.md,
    fontWeight: "600",
  },
  equipeChipRemove: {
    fontSize: fontSize.xs,
    color: colors.textPlaceholder,
    marginLeft: 2,
  },
  equipesGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  equipeGridItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: colors.borderLight,
    backgroundColor: colors.bgLight,
    gap: spacing.sm,
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
    fontSize: fontSize.md,
    color: colors.textPrimary,
    fontWeight: "500",
  },
  equipeGridCheck: {
    fontSize: fontSize.base,
    fontWeight: "700",
  },
  pwHint: {
    fontSize: fontSize.xs,
    color: colors.textPlaceholder,
    marginBottom: 10,
    lineHeight: 16,
  },
  commuTags: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  commuTag: {
    backgroundColor: colors.primaryLight,
    borderRadius: radius.lg,
    paddingHorizontal: 10,
    paddingVertical: spacing.xs,
  },
  commuTagText: {
    fontSize: fontSize.sm,
    color: colors.primary,
    fontWeight: "500",
  },
  formCard: {
    marginBottom: spacing.md,
  },
});
