/*
 **
 ** Phases & Notifications
 **
 */

// Phases
let currentPhase = 'turnSelectionPhase', // define the current phase for reference sake
    formerPhase, // store previous phase for reference sake
    turnSelectionPhase = true, // determine turn order
    drawPhase = false, // draw cards for hand
    casterSelectionPhase = false, // select caster card and place into active play
    resourcePoolingPhase = false, // add to resource pool to accrue spending points for support cards and levelling
    baseSwitchingPhase = false, // switch elemental base type if possible (pyro, hydro, terra, aero)
    supportSelectionPhase = false, // select support card and place into active play
    supportLevellingPhase = false, // caster support levelling if possible (proficient, adept, elite, peerless)
    levellingPhase = false, // caster levelling if possible (proficient, adept, elite, peerless)
    handConfirmationPhase = false, // prompt player to confirm or discard drawn hand
    casterConfirmationPhase = false, // prompt player to confirm or reject caster selection
    resourceConfirmationPhase = false, // prompt player to confirm or reject resource selection
    supportConfirmationPhase = false, // prompt player to confirm or reject support selection
    proceedConfirmationPhase = false, // prompt player to proceed to next given phase
    handBrowsingPhase = false, // allow player to browse hand
    previewSelectionPhase = false, // allow player to preview card
    // Notices
    invalidDrawNotice = false, // notify player of invalid draw (where no caster type cards are found)
    phaseGuideNotice = false, // notify player of current phase and provide instruction
    // Other
    activeDialogueBox = false; // indicate an active dialogue box

/*
 **
 ** Globals
 **
 */
let KeyDismissal,
    iterationDelay,
    iterationCount,
    remainingIterations,
    deckDisciplines;

/*
 **
 ** Stats Tracker
 **
 */
let battlePhaseTracker = 0;

/*
 **
 ** Constants
 **
 */
const cardMotiv = `<div class="card-motivs">
                        <div><i class="fas fa-fire"></i></div>
                        <div><i class="fas fa-mountain"></i></div>
                        <div><i class="fas fa-cloud-bolt"></i></div>
                        <div><i class="fas fa-droplet"></i></div>
                    </div>`,
    cardBack = `<div class="cardBack">
                    ${cardMotiv}
                    <div class="card-logo">Elemental</div>
                </div>`,
    dialogueBox = `<div class="dialogueBox inactive-dialogueBox" style="z-index: 0;">
                    <div class="dialogueBox-component">
                        <div class="dialogueBox-head">
                            <div class="dialogueBox-maximize dialogueBox-control"><i class="far fa-window-maximize"></i></div>
                            <div class="dialogueBox-minimize dialogueBox-control"><i class="far fa-window-minimize"></i></div>
                            <div class="dialogueBox-dismiss dialogueBox-control"><i class="fas fa-times"></i></div>
                        </div>
                        <div class="dialogueBox-body"></div>
                        <div class="dialogueBox-backgraound">
                            ${cardMotiv}
                        </div>
                    </div>
                    <div class="dialogueBox-backdrop"></div>
                </div>`;

/*
 **
 ** Transient Session Handler
 **
 */
let Player_Session = false,
    AI_Session = false;

// Switch between active sessions
function switchActiveSessions() {
    if (AI_Session) {
        AI_Session = false;
        Player_Session = true;

        jQuery('[data-field="ai-field"] .player-hand').removeClass(
            'activeHand'
        );
        jQuery('[data-field="player-field"] .player-hand').addClass(
            'activeHand'
        );
    } else if (Player_Session) {
        Player_Session = false;
        AI_Session = true;

        jQuery('[data-field="player-field"] .player-hand').removeClass(
            'activeHand'
        );
        jQuery('[data-field="ai-field"] .player-hand').addClass('activeHand');
    }
}

/*
 **
 ** Phase Guide & Indication
 **
 */
let guideInstruction;

// Phase guide update
function updatePhaseGuide(guideInstruction, phaseInstance) {
    // Update phase guide positioning
    switchPhaseGuidePositioning();

    if (!phaseGuideNotice) {
        // Separate string by every capital letter
        let currentPhaseIndicator = currentPhase.split(/(?=[A-Z])/);

        // Set current phase
        jQuery('.phaseGuide-current-phase').html(
            currentPhaseIndicator.join(' ')
        );

        // Set phase instruction
        jQuery('.phaseGuide-instruction').append(guideInstruction);

        jQuery('.phaseGuide')
            .removeClass('inactive-phaseGuide')
            .addClass('active-phaseGuide');

        phaseGuideNotice = true;
    } else if (phaseGuideNotice) {
        // if the phase guide already exists, clear it, dismiss it, delay it, then call it again

        dismissPhaseGuide();

        setTimeout(function () {
            if (phaseInstance == currentPhase) {
                // check if current phase is still the same phase at instance of initialisation

                // Separate string by every capital letter
                let currentPhaseIndicator = currentPhase.split(/(?=[A-Z])/);

                // Set current phase
                jQuery('.phaseGuide-current-phase').html(
                    currentPhaseIndicator.join(' ')
                );

                // Set phase instruction
                jQuery('.phaseGuide-instruction').append(guideInstruction);

                jQuery('.phaseGuide')
                    .removeClass('inactive-phaseGuide')
                    .addClass('active-phaseGuide');

                phaseGuideNotice = true;
            }
        }, 1000);
    }
}

// Phase guide dismissal
function dismissPhaseGuide() {
    phaseGuideNotice = false;

    jQuery('.phaseGuide')
        .removeClass('active-phaseGuide')
        .addClass('inactive-phaseGuide');
    jQuery('.phaseGuide-instruction').empty();
}

// Switch phase guide positioning
function switchPhaseGuidePositioning() {
    if (Player_Session) {
        jQuery('.phaseGuide')
            .removeClass('phaseGuide-topLeft')
            .addClass('phaseGuide-bottomRight');
    } else if (AI_Session) {
        jQuery('.phaseGuide')
            .removeClass('phaseGuide-bottomRight')
            .addClass('phaseGuide-topLeft');
    }
}

// Phase indicator update
function updatePhaseIndicator() {
    // Separate string by every capital letter
    let currentPhaseIndicator = currentPhase.split(/(?=[A-Z])/);

    // Switch current phase
    jQuery('.overview-display-phase')
        .clone()
        .addClass('overview-conceal-phase')
        .appendTo('.overview-phase-indicator');
    jQuery('.overview-current-phase')
        .not('.overview-conceal-phase')
        .removeClass('overview-display-phase')
        .addClass('overview-former-phase');
    jQuery('.overview-conceal-phase').html(currentPhaseIndicator.join(' '));

    // Set current phase
    setTimeout(function () {
        jQuery('.overview-conceal-phase')
            .removeClass('overview-conceal-phase')
            .addClass('overview-display-phase');
        jQuery('.overview-former-phase').remove();
    }, 200);
}

// Update phase indicator on initialization
updatePhaseIndicator();

/*
 **
 ** Dialogue Box Logic
 **
 */
let dialogueBoxContent;

// Insert Dialogue Box into DOM if not already present
if (jQuery('.dialogueBox').length <= 0) {
    jQuery(dialogueBox).prependTo('.wrapper');
}

// Call/Dismiss Dialogue Box
function toggleDialogueBox(windowControl, allowKeyDismissal) {
    // Remove dialogue box note
    jQuery('.dialogueBox-note').remove();

    if (jQuery('.dialogueBox').hasClass('active-dialogueBox')) {
        // hide the dialogue box

        jQuery('.dialogueBox').toggleClass(
            'active-dialogueBox inactive-dialogueBox'
        );
        setTimeout(function () {
            jQuery('.dialogueBox').removeClass(
                'minimized-dialogueBox maximized-dialogueBox'
            );
            jQuery('.dialogueBox-minimize, .dialogueBox-maximize').hide();
        }, 200);

        activeDialogueBox = false; // define the dialogue box state
        dialogueBoxContent = null; // reset the dialogue box content storage variable
        KeyDismissal = false; // disable dialogue box key dismissal

        // allow time for the closing animations to complete
        setTimeout(function () {
            jQuery('.dialogueBox').css('z-index', '0');
            jQuery('.dialogueBox-body').empty(); // empty the body of the dialogue box in preparation for future use
        }, 500);

        // run callback function based on the current phase
        if (turnSelectionPhase) {
            endTurnSelectPhase();
        } else if (invalidDrawNotice) {
            dismissInvalidDrawNotice(); // dismiss invalid draw notice
        }
    } else if (jQuery('.dialogueBox').hasClass('inactive-dialogueBox')) {
        // display the dialogue box

        if (windowControl) {
            // determine if window control is required
            jQuery('.dialogueBox-minimize').show();
            jQuery('.dialogueBox').addClass('maximized-dialogueBox');
        } else if (!windowControl) {
            jQuery('.dialogueBox').removeClass('maximized-dialogueBox');
            jQuery('.dialogueBox-minimize').hide();
        }

        if (dialogueBoxContent != null) {
            // only display the dialogue box if content has been defined

            jQuery('.dialogueBox').toggleClass(
                'active-dialogueBox inactive-dialogueBox'
            );

            activeDialogueBox = true;

            jQuery('.dialogueBox').css('z-index', '99');

            // Listen for keydown events to dismiss active dialogue box
            KeyDismissal = false;

            setTimeout(function () {
                // allow time for dialogue box to display

                if (allowKeyDismissal) {
                    KeyDismissal = true;
                    keyDialogueBoxDismissal();
                }
            }, 500);
        }
    }
}

function displayDialogueBoxNote() {
    let dialogueBoxOffset, dialogueBoxTop, dialogueBoxLeft;

    // Allow time for dialogue box to dock before displaying note
    setTimeout(function () {
        // Retrieve co-ordinates and dimensions of docked dialogue box
        (dialogueBoxOffset = jQuery('.dialogueBox-component').offset()),
            (dialogueBoxTop =
                dialogueBoxOffset.top - jQuery(window).scrollTop()),
            (dialogueBoxLeft = dialogueBoxOffset.left);

        jQuery('.dialogueBox-note').css({
            top: dialogueBoxTop,
            left: dialogueBoxLeft,
        });

        jQuery('.dialogueBox-note').addClass('dialogueBox-note-active');
    }, 500);
}

// Minimize/Maximize Dialogue Box
function toggleDockDialogueBox() {
    // Remove dialogue box note
    jQuery('.dialogueBox-note').remove();

    if (!jQuery('.dialogueBox-note').length) {
        const dialogueBoxNote =
            '<div class="dialogueBox-note"><span></span><i class="fas fa-info-circle"></i></div>';

        jQuery('.dialogueBox').prepend(dialogueBoxNote);
    }

    if (jQuery('.dialogueBox').hasClass('maximized-dialogueBox')) {
        // dock the dialogue box

        jQuery('.dialogueBox')
            .removeClass('maximized-dialogueBox')
            .addClass('minimized-dialogueBox');
        jQuery('.dialogueBox-maximize').show();
        jQuery('.dialogueBox-minimize').hide();

        // Position and display dialogue box note
        displayDialogueBoxNote();

        // Current phase progression condition
        switch (currentPhase) {
            case 'handConfirmationPhase':
                handConfirmationPhase = false;
                handBrowsingPhase = true;
                formerPhase = 'handConfirmationPhase';
                currentPhase = 'handBrowsingPhase';

                // Update and display phase guide
                guideInstruction =
                    'Browse hand and preview cards.<br><small>Placing a valid caster card into play will approve the draw.</small>';
                updatePhaseGuide(guideInstruction, currentPhase);

                // Set dialogue box note
                jQuery('.dialogueBox-note span').text(
                    'Maximise: Accept Hand / Reject Hand'
                );

                // Update phase indicator
                updatePhaseIndicator();

                break;
            default:
                currentPhase = '';
        }
    } else if (jQuery('.dialogueBox').hasClass('minimized-dialogueBox')) {
        // undock the dialogue box

        jQuery('.dialogueBox')
            .removeClass('minimized-dialogueBox')
            .addClass('maximized-dialogueBox');
        jQuery('.dialogueBox-minimize').show();
        jQuery('.dialogueBox-maximize').hide();

        // Position and display dialogue box note
        displayDialogueBoxNote();

        // Current phase progression condition
        switch (currentPhase) {
            case 'handBrowsingPhase':
                handBrowsingPhase = false;
                handConfirmationPhase = true;
                formerPhase = 'handBrowsingPhase';
                currentPhase = 'handConfirmationPhase';

                // Default dialogue box note
                jQuery('.dialogueBox-note span').text('Minimize: Browse Hand');

                // Update phase indicator
                updatePhaseIndicator();

                break;
            case 'previewSelectionPhase':
                previewSelectionPhase = false;
                handConfirmationPhase = true;
                formerPhase = 'previewSelectionPhase';
                currentPhase = 'handConfirmationPhase';

                // Default dialogue box note
                jQuery('.dialogueBox-note span').text('Minimize: Browse Hand');

                // Dismiss preview pane
                if (jQuery(previewPane).hasClass('inView')) {
                    jQuery(previewPane).removeClass('inView');
                }

                // Update phase indicator
                updatePhaseIndicator();

                break;
            default:
                currentPhase = '';
        }
    }
}

// toggle dock with mouse
jQuery('.wrapper').on(
    'click',
    '.dialogueBox-minimize, .dialogueBox-maximize',
    function () {
        if (Player_Session) {
            toggleDockDialogueBox();
        }
    }
);

// dismiss with keys
function keyDialogueBoxDismissal() {
    if (turnSelectionPhase || Player_Session) {
        jQuery(document).on('keydown', function (e) {
            if (activeDialogueBox && KeyDismissal) {
                dialogueBoxContent = null; // reset the dialogue box content storage variable

                const key = e.key;

                switch (key) {
                    case 'Escape':
                        toggleDialogueBox(false, false);
                        break;

                    case 'Enter':
                        toggleDialogueBox(false, false);
                        break;
                }

                KeyDismissal = false; // disable dialogue box key dismissal

                // Determine progression based on current phase
                afterDialogueBoxDismissal();
            }
        });
    }
}

// dismiss with mouse
jQuery('.wrapper').on(
    'click',
    '.dialogueBox-backdrop, .dialogueBox-dismiss',
    function () {
        if (turnSelectionPhase || Player_Session) {
            // Determine progression based on current phase
            afterDialogueBoxDismissal();
        }
    }
);

// Proceed with relevant phase after dialogue box dismissal
function afterDialogueBoxDismissal() {
    if (handConfirmationPhase) {
        determineHandConfirmation(playerHand, 'true');
    } else if (casterConfirmationPhase) {
        determineCasterConfirmation('true');
    } else if (resourceConfirmationPhase) {
        determineResourceConfirmation('true');
    } else if (supportConfirmationPhase) {
        determineSupportConfirmation('true');
    } else if (proceedConfirmationPhase) {
        determineProgressionConfirmation('true');
    } else {
        toggleDialogueBox(false, false);
    }
}

// Confirm with mouse
jQuery('.dialogueBox').on('click', '.btn-confirm', function () {
    if (Player_Session) {
        if (handConfirmationPhase) {
            const handPermanence = jQuery(this).attr('data-confirm');

            determineHandConfirmation(playerHand, handPermanence); // handle confirmation response
        } else if (casterConfirmationPhase) {
            const confirmCaster = jQuery(this).attr('data-confirm');

            determineCasterConfirmation(confirmCaster);
        } else if (resourceConfirmationPhase) {
            const confirmResource = jQuery(this).attr('data-confirm');

            determineResourceConfirmation(confirmResource);
        } else if (supportConfirmationPhase) {
            const confirmSupport = jQuery(this).attr('data-confirm');

            determineSupportConfirmation(confirmSupport);
        } else if (proceedConfirmationPhase) {
            const confirmProgression = jQuery(this).attr('data-confirm');

            determineProgressionConfirmation(confirmProgression);
        }
    }
});
/*
// Typescript conversion refactor 
jQuery('.dialogueBox').on('click', '.btn-confirm', function () {
    if (session === SESSION.PLAYER) { // enum for session type : SESSION : PLAYER = 1, AI = 2
        // enum for confirmation type : CONFIRMATION : NONE = null, PROCEED = 1, RECEDE = 2, DEFER = -1
        const confirmation = jQuery(this).attr('data-confirm') || CONFIRMATION.NONE;

        switch(phase) { // state variable holding the current phase
            case PHASE.HAND_CONFIRMATION:
                determineHandConfirmation(playerHand, confirmation);
                break;
            case PHASE.CASTER_CONFIRMATION:
                determineCasterConfirmation(confirmation)
                break;
            case PHASE.RESOURCE_CONFIRMATION:
                determineResourceConfirmation(confirmation);
                break;
            case PHASE.SUPPORT_CONFIRMATION:
                determineSupportConfirmation(confirmation);
                break;
            case PHASE.PROCEED_CONFIRMATION:
                determineProgressionConfirmation(confirmation);
                break;
            default:
                // defensive programming, although should never be an unassigned/recognised phase to handle
                console.warn('No confirmation phase defined.');
                return;
        }
    }
});
 */
jQuery('.dialogueBox').on('mouseover', '.btn-confirm', function () {
    if (Player_Session) {
        jQuery('.btn-confirm').removeClass('focus');
        jQuery(this).addClass('focus');
    }
});

// Confirm with keys
function keyConfirmation() {
    if (Player_Session) {
        if (handConfirmationPhase) {
            const handPermanence =
                jQuery('.btn-confirm.focus').attr('data-confirm');

            determineHandConfirmation(playerHand, handPermanence); // handle confirmation response
        } else if (casterConfirmationPhase) {
            const confirmCaster =
                jQuery('.btn-confirm.focus').attr('data-confirm');

            determineCasterConfirmation(confirmCaster);
        } else if (resourceConfirmationPhase) {
            const confirmResource =
                jQuery('.btn-confirm.focus').attr('data-confirm');

            determineResourceConfirmation(confirmResource);
        } else if (supportConfirmationPhase) {
            const confirmSupport =
                jQuery('.btn-confirm.focus').attr('data-confirm');

            determineSupportConfirmation(confirmSupport);
        } else if (proceedConfirmationPhase) {
            const confirmProgression =
                jQuery('.btn-confirm.focus').attr('data-confirm');

            determineProgressionConfirmation(confirmProgression);
        }
    }
}

/*
 **
 ** Building Decks
 **
 */

// Define deck discipline distribution
deckDisciplines = {
    aerolurgy: true,
    terralurgy: true,
    hydrolurgy: true,
    pyrolurgy: true,
};

// Shuffle Method
// An ES6 / ECMAScript 2015 shuffling function based on the Durstenfeld shuffle
// https://stackoverflow.com/questions/2450954/how-to-randomize-shuffle-a-javascript-array
function shuffleArray(deckArray) {
    for (let i = deckArray.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [deckArray[i], deckArray[j]] = [deckArray[j], deckArray[i]]; // eslint-disable-line no-param-reassign
    }
    //console.log(deckArray);
}

// Assign and generate deck
let useStandbyDeck = true,
    player_standbyDeck,
    player_deckName;
if (useStandbyDeck) {
    player_standbyDeck = [...Array(60).keys()]; // build array consisting of 60 unit values
    player_deckName = 'Auto-generated Deck';
}
shuffleArray(player_standbyDeck);
console.log(player_standbyDeck);

// Set deck name
jQuery('.overview-deck-details').text(player_deckName);

/*
 **
 ** Deck Management
 **
 */
// check if any cards remain in standby deck
// Returns: Boolean
function checkForRemainingCardsInDeck(playerHand, deck) {
    if (
        typeof deck != 'undefined' &&
        deck != null &&
        deck.length != null &&
        deck.length > 0
    ) {
        return true;
    } else {
        // empty standby deck
        console.log('no remaining cards in deck');
        jQuery(playerHand).find('.standby-pile').children().remove(); // remove any lingering standby card templates
        return false;
    }
}

// Randomly generate the base power
function generateCardPower() {
    // Generate a random number between 25 and 100
    let cardForce = Math.floor(Math.random() * (100 - 25 + 1) + 25);

    if (cardForce > 70 && cardForce < 80) {
        //console.log(cardForce);
        for (let i = 0; i < 3; i++) {
            cardForce = Math.floor(Math.random() * (100 - 25 + 1) + 25);
            //console.log('adjusted',cardForce);
            if (cardForce < 70) {
                i = 3;
            }
        }
    } else if (cardForce > 80 && cardForce < 90) {
        //console.log(cardForce);
        for (let i = 0; i < 5; i++) {
            cardForce = Math.floor(Math.random() * (100 - 25 + 1) + 25);
            //console.log('adjusted',cardForce);
            if (cardForce < 80) {
                i = 5;
            }
        }
    } else if (cardForce > 90) {
        //console.log(cardForce);
        for (let i = 0; i < 10; i++) {
            cardForce = Math.floor(Math.random() * (100 - 25 + 1) + 25);
            //console.log('adjusted',cardForce);
            if (cardForce < 90) {
                i = 10;
            }
        }
    }

    return cardForce;
}

// Randomly generate card type
function generateCardType() {
    // Generate a random number between 1 and 10
    const cardType = Math.floor(Math.random() * (10 + 1)); // 1 -> 9 = caster card, 10 = support card

    if (cardType == 10) {
        //console.log(cardType);
        //console.log('Support Card');
    } else {
        //console.log(cardType);
        //console.log('Caster Card');
    }

    return cardType;
}

// Randomly generate card support effect
function generateCardSupport() {
    let supportBuff = Math.floor(Math.random() * (10 - 1 + 1) + 1), // 1 -> 5 = health boost, 6 -> 10 = attack boost
        supportNerf = Math.floor(Math.random() * (10 - 1 + 1) + 1), // 1 -> 5 = health nerf, 6 -> 10 = attack nerf
        supportType = Math.floor(Math.random() * (30 - 1 + 1) + 1), // 1 -> 5 = buff type, 6 -> 10 = nerf type, 11 -> 15 = battle effect type, 16 -> 20 = strategic effect type, 21 -> 30 = levelling type
        supportBuild = 'placeholder',
        supportDesc,
        supportTitle,
        supportEfficacy,
        supportDuration,
        supportCost,
        supportDiscipline,
        supportID,
        returnedSupportCard;

    // TEMP : To be detemined by specific card
    supportEfficacy = Math.floor(Math.random() * (100 - 25 + 1) + 25); // 25 -> 69 = neophyte, 70 -> 79 = proficient, 80 -> 89 = adept, 90 -> 99 = elite, 100 = peerless
    supportDuration = Math.floor(Math.random() * (10 - 1 + 1) + 1); // 1 -> 8 = epheremal, 9 -> 10 = perennial

    supportDuration = supportDuration <= 8 ? 'epheremal' : 'perennial';

    if (supportType > 0 && supportType <= 5) {
        // Buff type support

        if (supportBuff > 0 && supportBuff <= 5) {
            supportDesc =
                "Used during Support Phase. <br>Reduce opponent's attack power by 10";
            supportType = 'Buff';

            supportBuild = `<div class="card-support-motiv support-buff-effect" data-support-duration="${supportDuration}">
                                <i class="fas fa-shield-alt"></i>
                                <i class="fas fa-angle-double-up"></i>
                            </div>
                            <div class="support-description">
                                ${supportDesc}
                            </div>
                        <div class="support-efficacy">${supportEfficacy}</div>
                        <div class="support-type">${supportType}</div>`;
        } else if (supportBuff > 5 && supportBuff <= 10) {
            supportDesc =
                'Used during Support Phase. <br>Boost own attack power by 10';
            supportType = 'Buff';

            supportBuild = `<div class="card-support-motiv support-buff-effect" data-support-duration="${supportDuration}">
                                <i class="fas fa-crosshairs"></i>
                                <i class="fas fa-angle-double-up"></i>
                            </div>
                            <div class="support-description">
                                ${supportDesc}
                            </div>
                        <div class="support-efficacy">${supportEfficacy}</div>
                        <div class="support-type">${supportType}</div>`;
        }
    } else if (supportType > 5 && supportType <= 10) {
        // Nerf type support

        if (supportNerf > 0 && supportNerf <= 5) {
            supportDesc =
                'Used during Support Phase. <br>Boost own attack power by 10';
            supportType = 'Nerf';

            supportBuild = `<div class="card-support-motiv support-nerf-effect" data-support-duration="${supportDuration}">
                                <i class="fas fa-shield-alt"></i>
                                <i class="fas fa-angle-double-down"></i>
                            </div>
                            <div class="support-description">
                                ${supportDesc}
                            </div>
                        <div class="support-efficacy">${supportEfficacy}</div>
                        <div class="support-type">${supportType}</div>`;
        } else if (supportNerf > 5 && supportNerf <= 10) {
            supportDesc =
                "Used during Support Phase. <br>Reduce opponent's attack power by 10";
            supportType = 'Nerf';

            supportBuild = `<div class="card-support-motiv support-nerf-effect" data-support-duration="${supportDuration}">
                                <i class="fas fa-crosshairs"></i>
                                <i class="fas fa-angle-double-down"></i>
                            </div>
                            <div class="support-description">
                                ${supportDesc}
                            </div>
                        <div class="support-efficacy">${supportEfficacy}</div>
                        <div class="support-type">${supportType}</div>`;
        }
    } else if (supportType > 10 && supportType <= 15) {
        // Battle effect type support

        supportDesc =
            'Used during Support Phase. <br>This is a battle effect type support card <br>Hydro: Freeze (paralysis), <br>Terra: Toxic (poisoning), <br>Pyro: Scorch (burning), <br>Aero: Shock (paralysis)';
        supportType = 'Battle';

        supportBuild = `<div class="card-support-motiv support-battle-effect" data-support-duration="${supportDuration}">
                            <i class="far fa-hand-rock"></i>
                        </div>
                        <div class="support-description">
                            ${supportDesc}
                        </div>
                        <div class="support-efficacy">${supportEfficacy}</div>
                        <div class="support-type">${supportType}</div>`;
    } else if (supportType > 15 && supportType <= 20) {
        // Strategic effect type support

        supportDesc =
            'Used during Support Phase. <br>This is a strategy effect type support card <br>Hydro: Tidal Force (Flush Deck), <br>Terra: Tectonic Shift (Bury Support), <br>Pyro: Scorched Earth (Burn Resources), <br>Aero: Gale Force (Sweep Away Hand)';
        supportType = 'Strategic';

        supportBuild = `<div class="card-support-motiv support-strategic-effect" data-support-duration="${supportDuration}">
                            <i class="far fa-hand-paper"></i>
                        </div>
                        <div class="support-description">
                            ${supportDesc}
                        </div>
                        <div class="support-efficacy">${supportEfficacy}</div>
                        <div class="support-type">${supportType}</div>`;
    } else if (supportType > 20 && supportType <= 30) {
        // Levelling type support

        // Return a randomly generated support card
        returnedSupportCard = returnLevellingSupportCard();

        supportDesc = returnedSupportCard.description;
        supportTitle = returnedSupportCard.appellation;
        supportType = 'Levelling';
        supportRank = returnedSupportCard.rank;
        supportEfficacy = returnedSupportCard.efficacy;
        supportCost = returnedSupportCard.cost;
        supportDiscipline = returnedSupportCard.discipline;
        supportID = returnedSupportCard.specification;

        supportBuild = `<div class="card-support-motiv support-levelling-effect">
                            <i class="fas fa-arrow-turn-up"></i>
                            <i class="fas fa-arrow-turn-down"></i>
                        </div>
                        <div class="support-title">${supportTitle}</div>
                        <div class="support-description">
                            ${supportDesc}
                        </div>
                        <div class="support-efficacy">${supportEfficacy}</div>
                        <div class="support-type">${supportType}</div>
                        <div class="support-attributes" 
                            data-type="${supportType}"
                            data-appellation="${supportTitle}"
                            data-rank="${supportRank}"
                            data-efficacy="${supportEfficacy}"
                            data-cost="${supportCost}" 
                            data-discipline="${supportDiscipline}" 
                            data-id="${supportID}">
                        </div>`;
    }

    return supportBuild;
}

// Support card attribute constructor
function SupportCardAttributes(
    specification,
    appellation,
    description,
    cost,
    ranking,
    efficacy,
    discipline
) {
    this.specification = specification; // the ID associated with the function to invoke
    this.appellation = appellation; // the name of the support card
    this.description = description; // the description of the support card
    this.cost = cost; // the resource cost of the support card
    this.ranking = ranking; // the ranking of the support card
    this.efficacy = efficacy; // the efficacy of the support card will determine tier designation
    this.discipline = discipline; // the discipline of the support card if applicable
}

// Randomly return Levelling Support card
function returnLevellingSupportCard() {
    const levellingRandomizer = Math.floor(Math.random() * (8 - 1 + 1) + 1);
    let levellingCard, supportDescription;

    switch (levellingRandomizer) {
        // 1 = Level Acceleration
        case 1:
            supportDescription =
                "Advance a Caster's rank by one tier at no levelling cost. <br><br>Usage: Levelling Phase. <br><br>Requirement: Must share same discipline. <br><br>Exception: Not possible in deviant states.";
            return (levellingCard = new SupportCardAttributes(
                100,
                'Level Acceleration',
                supportDescription,
                1,
                'neophyte',
                25
            ));
            break;
        // 2 = Level Retrograde
        case 2:
            supportDescription =
                "Revert a Caster's rank to its previous tier. <br><br>Usage: Levelling Phase.";
            return (levellingCard = new SupportCardAttributes(
                101,
                'Level Retrograde',
                supportDescription,
                3,
                'proficient',
                70
            ));
            break;
        // 3 = Level Circumvention
        case 3:
            supportDescription =
                "Bypass following tier and advance a Caster's rank x2 levels up. <br><br>Usage: Levelling Phase. <br><br>Requirement: Must share same discipline. Levelling cost must be settled. <br><br>Exception: Not possible in deviant states.";
            return (levellingCard = new SupportCardAttributes(
                102,
                'Level Circumvention',
                supportDescription,
                4,
                'adept',
                80
            ));
            break;
        // 4 = Level Exchange
        case 4:
            supportDescription =
                'Exchange Caster with any other Caster of the same rank regardless of discipline. <br><br>Usage: Levelling Phase. <br><br>Requirement: Levelling cost must be settled.';
            return (levellingCard = new SupportCardAttributes(
                103,
                'Level Exchange',
                supportDescription,
                2,
                'neophyte',
                25
            ));
            break;
        // 5 = Level Speciality Indifference
        case 5:
            supportDescription =
                "Advance a Caster's rank by one tier regardless of discipline. <br><br>Usage: Levelling Phase. <br><br>Requirement: Levelling cost must be settled.";
            return (levellingCard = new SupportCardAttributes(
                104,
                'Level Speciality Indifference',
                supportDescription,
                2,
                'proficient',
                70
            ));
            break;
        // 6 = Level Relegation
        case 6:
            supportDescription =
                "Revert an opponent's Caster's rank by one tier. <br><br>Usage: Levelling Phase.";
            return (levellingCard = new SupportCardAttributes(
                105,
                'Level Relegation',
                supportDescription,
                5,
                'elite',
                90
            ));
            break;
        // 7 = Negligible Designation
        case 7:
            supportDescription =
                "Revert an opponent's Caster's rank back to the first tier. <br><br>Usage: Levelling Phase.";
            return (levellingCard = new SupportCardAttributes(
                106,
                'Negligible Designation',
                supportDescription,
                7,
                'peerless',
                100
            ));
            break;
        // 8 = Negligible Succession
        case 8:
            supportDescription =
                "Advance or regress a Caster's rank to any tier and discipline at no levelling cost. <br><br>Usage: Levelling Phase.";
            return (levellingCard = new SupportCardAttributes(
                107,
                'Negligible Succession',
                supportDescription,
                7,
                'peerless',
                100
            ));
            break;
    }
}

// Reveal card and assign rank determined by base power
function revealDrawnCard(drawnCard, clonedCard, cardData) {
    setTimeout(function () {
        jQuery(drawnCard).addClass('flippedCard'); // flip the modified card in the standby deck

        setTimeout(function () {
            jQuery(drawnCard).add(clonedCard).find('.cardBack').remove(); // remove the back
            jQuery(drawnCard).remove(); // remove the modified card in the standby deck

            if (useStandbyDeck) {
                // Determine card type
                let cardType = generateCardType();

                if (cardType <= 9) {
                    // caster type card

                    // Build card and define attributes
                    let elArray = ['terra', 'aero', 'hydro', 'pyro'],
                        cardDiscipline =
                            elArray[Math.floor(Math.random() * elArray.length)], // retrieve random value from array
                        cardForce = generateCardPower(),
                        cardType = 'Caster',
                        cardBody = `<div class="cardFront">
                                    <div class="card-marker"><i class="fas fa-check"></i>Valid</div>
                                    <div class="card-number">${cardData}</div>
                                    <div class="card-discipline">${cardDiscipline}</div>
                                    <div class="card-resource-currency"></div>
                                    <div class="card-elemental-motif"></div>
                                    <div class="card-force-indicator">
                                        <svg viewBox="0 0 32 32">
                                        <circle r="16" cx="16" cy="16" style="stroke-dasharray: ${cardForce} 100;"></circle>
                                        </svg>
                                        <div class="elite-force-indicator"></div>
                                        <div class="adept-force-indicator"></div>
                                        <div class="proficient-force-indicator"></div>
                                    </div>
                                    <div class="card-force">${cardForce}</div>
                                    <div class="card-type">${cardType}</div>
                                    <div class="card-ranking"></div>
                                    <div class="card-levelling-cost"></div>
                                    <div class="card-attributes" 
                                        data-type="${cardType}"
                                        data-rank=""
                                        data-rank-next=""
                                        data-force="${cardForce}"
                                        data-cost="" 
                                        data-currency="" 
                                        data-discipline="${cardDiscipline}">
                                    </div>
                                </div>`;
                    jQuery(clonedCard)
                        .prepend(cardBody)
                        .removeClass('ghostCard');

                    // Define card type
                    jQuery(clonedCard)
                        .find('.cardFront')
                        .addClass('caster-card-type');

                    // Determine card ranking
                    if (cardForce == 100) {
                        jQuery(clonedCard)
                            .find('.cardFront')
                            .addClass('peerless-ranking');
                        jQuery(clonedCard)
                            .find('.card-ranking')
                            .prepend(
                                '<i class="far fa-star"></i><i class="far fa-star"></i><i class="far fa-star"></i><i class="far fa-star"></i>'
                            );

                        // Update Rank attributes
                        jQuery(clonedCard)
                            .find('.card-attributes')
                            .attr('data-rank', 'peerless');
                        jQuery(clonedCard)
                            .find('.card-attributes')
                            .removeAttr('data-rank-next');

                        // Update Levelling Cost
                        jQuery(clonedCard)
                            .find('.card-levelling-cost')
                            .prepend(
                                `<div class="levelling-cost" data-levelling-cost="20">
                                          <i class="fas fa-circle"></i>
                                          <i class="fas fa-circle"></i>
                                          <i class="fas fa-circle"></i>
                                          <i class="fas fa-circle"></i>
                                          <i class="fas fa-circle"></i>
                                      </div>`
                            );

                        // Update Resource Currency
                        jQuery(clonedCard).attr('data-resource-currency', '0');

                        // Update Levelling Cost attribute
                        jQuery(clonedCard)
                            .find('.card-attributes')
                            .attr('data-cost', '20');

                        // Update Resource Currency attribute
                        jQuery(clonedCard)
                            .find('.card-attributes')
                            .attr('data-currency', '0');
                    } else if (cardForce >= 90 && cardForce != 100) {
                        jQuery(clonedCard)
                            .find('.cardFront')
                            .addClass('elite-ranking');
                        jQuery(clonedCard)
                            .find('.card-ranking')
                            .prepend(
                                '<i class="fas fa-star"></i><i class="fas fa-star"></i><i class="fas fa-star"></i>'
                            );

                        // Update Rank attributes
                        jQuery(clonedCard)
                            .find('.card-attributes')
                            .attr('data-rank', 'elite');
                        jQuery(clonedCard)
                            .find('.card-attributes')
                            .attr('data-rank-next', 'peerless');

                        // Update Levelling Cost
                        jQuery(clonedCard)
                            .find('.card-levelling-cost')
                            .prepend(
                                `<div class="levelling-cost" data-levelling-cost="10">
                                          <i class="fas fa-circle"></i>
                                          <i class="fas fa-circle"></i>
                                          <i class="fas fa-circle"></i>
                                          <i class="far fa-circle"></i>
                                          <i class="far fa-circle"></i>
                                      </div>`
                            );

                        // Update Resource Currency
                        jQuery(clonedCard).attr('data-resource-currency', '1');
                        jQuery(clonedCard)
                            .find('.card-resource-currency')
                            .prepend('<i class="fas fa-circle"></i>');

                        // Update Levelling Cost attribute
                        jQuery(clonedCard)
                            .find('.card-attributes')
                            .attr('data-cost', '10');

                        // Update Resource Currency attribute
                        jQuery(clonedCard)
                            .find('.card-attributes')
                            .attr('data-currency', '1');
                    } else if (cardForce >= 80 && cardForce < 90) {
                        jQuery(clonedCard)
                            .find('.cardFront')
                            .addClass('adept-ranking');
                        jQuery(clonedCard)
                            .find('.card-ranking')
                            .prepend(
                                '<i class="fas fa-star"></i><i class="fas fa-star"></i>'
                            );

                        // Update Rank attributes
                        jQuery(clonedCard)
                            .find('.card-attributes')
                            .attr('data-rank', 'adept');
                        jQuery(clonedCard)
                            .find('.card-attributes')
                            .attr('data-rank-next', 'elite');

                        // Update Levelling Cost
                        jQuery(clonedCard)
                            .find('.card-levelling-cost')
                            .prepend(
                                `<div class="levelling-cost" data-levelling-cost="5">
                                          <i class="fas fa-circle"></i>
                                          <i class="fas fa-circle"></i>
                                          <i class="far fa-circle"></i>
                                          <i class="far fa-circle"></i>
                                          <i class="far fa-circle"></i>
                                      </div>`
                            );

                        // Update Resource Currency
                        jQuery(clonedCard).attr('data-resource-currency', '2');
                        jQuery(clonedCard)
                            .find('.card-resource-currency')
                            .prepend(
                                '<i class="fas fa-circle"></i><i class="fas fa-circle"></i>'
                            );

                        // Update Levelling Cost attribute
                        jQuery(clonedCard)
                            .find('.card-attributes')
                            .attr('data-cost', '5');

                        // Update Resource Currency attribute
                        jQuery(clonedCard)
                            .find('.card-attributes')
                            .attr('data-currency', '2');
                    } else if (cardForce >= 70 && cardForce < 80) {
                        jQuery(clonedCard)
                            .find('.cardFront')
                            .addClass('proficient-ranking');
                        jQuery(clonedCard)
                            .find('.card-ranking')
                            .prepend('<i class="fas fa-star"></i>');

                        // Update Rank attributes
                        jQuery(clonedCard)
                            .find('.card-attributes')
                            .attr('data-rank', 'proficient');
                        jQuery(clonedCard)
                            .find('.card-attributes')
                            .attr('data-rank-next', 'adept');

                        // Update Levelling Cost
                        jQuery(clonedCard)
                            .find('.card-levelling-cost')
                            .prepend(
                                `<div class="levelling-cost" data-levelling-cost="3">
                                          <i class="fas fa-circle"></i>
                                          <i class="far fa-circle"></i>
                                          <i class="far fa-circle"></i>
                                          <i class="far fa-circle"></i>
                                          <i class="far fa-circle"></i>
                                      </div>`
                            );

                        // Update Resource Currency
                        jQuery(clonedCard).attr('data-resource-currency', '3');
                        jQuery(clonedCard)
                            .find('.card-resource-currency')
                            .prepend(
                                '<i class="fas fa-circle"></i><i class="fas fa-circle"></i><i class="fas fa-circle"></i>'
                            );

                        // Update Levelling Cost attribute
                        jQuery(clonedCard)
                            .find('.card-attributes')
                            .attr('data-cost', '3');

                        // Update Resource Currency attribute
                        jQuery(clonedCard)
                            .find('.card-attributes')
                            .attr('data-currency', '3');
                    } else if (cardForce >= 25 && cardForce < 70) {
                        jQuery(clonedCard)
                            .find('.cardFront')
                            .addClass('neophyte-ranking');

                        // Update Rank attributes
                        jQuery(clonedCard)
                            .find('.card-attributes')
                            .attr('data-rank', 'neophyte');
                        jQuery(clonedCard)
                            .find('.card-attributes')
                            .attr('data-rank-next', 'proficient');

                        // Update Resource Currency
                        if (cardForce >= 45 && cardForce < 70) {
                            jQuery(clonedCard).attr(
                                'data-resource-currency',
                                '4'
                            );
                            jQuery(clonedCard)
                                .find('.card-resource-currency')
                                .prepend(
                                    '<i class="fas fa-circle"></i><i class="fas fa-circle"></i><i class="fas fa-circle"></i><i class="fas fa-circle"></i>'
                                );

                            // Update Resource Currency attribute
                            jQuery(clonedCard)
                                .find('.card-attributes')
                                .attr('data-currency', '4');
                        } else if (cardForce >= 25 && cardForce < 45) {
                            jQuery(clonedCard).attr(
                                'data-resource-currency',
                                '5'
                            );
                            jQuery(clonedCard)
                                .find('.card-resource-currency')
                                .prepend(
                                    '<i class="fas fa-circle"></i><i class="fas fa-circle"></i><i class="fas fa-circle"></i><i class="fas fa-circle"></i><i class="fas fa-circle"></i>'
                                );

                            // Update Resource Currency attribute
                            jQuery(clonedCard)
                                .find('.card-attributes')
                                .attr('data-currency', '5');
                        }

                        // Update Levelling Cost attribute
                        jQuery(clonedCard)
                            .find('.card-attributes')
                            .attr('data-cost', '0');
                    }

                    // Determine discipline type
                    if (cardDiscipline == 'terra') {
                        jQuery(clonedCard)
                            .find('.cardFront')
                            .addClass('terra-motiv');
                        jQuery(clonedCard)
                            .find('.card-elemental-motif')
                            .prepend('<i class="fas fa-mountain"></i>');
                    } else if (cardDiscipline == 'aero') {
                        jQuery(clonedCard)
                            .find('.cardFront')
                            .addClass('aero-motiv');
                        jQuery(clonedCard)
                            .find('.card-elemental-motif')
                            .prepend('<i class="fas fa-cloud-bolt"></i>');
                    } else if (cardDiscipline == 'hydro') {
                        jQuery(clonedCard)
                            .find('.cardFront')
                            .addClass('hydro-motiv');
                        jQuery(clonedCard)
                            .find('.card-elemental-motif')
                            .prepend('<i class="fas fa-droplet"></i>');
                    } else if (cardDiscipline == 'pyro') {
                        jQuery(clonedCard)
                            .find('.cardFront')
                            .addClass('pyro-motiv');
                        jQuery(clonedCard)
                            .find('.card-elemental-motif')
                            .prepend('<i class="fas fa-fire"></i>');
                    }
                } else if (cardType == 10) {
                    // support type card

                    // Build card and define attributes
                    let elArray = ['terra', 'aero', 'hydro', 'pyro'],
                        cardDiscipline =
                            elArray[Math.floor(Math.random() * elArray.length)], // retrieve random value from array
                        cardSupport = generateCardSupport(),
                        cardType = 'Support',
                        cardBody = `<div class="cardFront">
                                                      <div class="card-marker"><i class="fas fa-check"></i>Valid</div>
                                                      <div class="card-number">${cardData}</div>
                                                      <div class="card-discipline"></div>
                                                      <div class="card-elemental-motif"></div>
                                                      <div class="card-support">${cardSupport}</div>
                                                      <div class="card-type">${cardType}</div>
                                                      <div class="card-ranking"></div>
                                                      <div class="card-resource-cost"></div>
                                                      <div class="card-attributes" 
                                                          data-type="${cardType}"
                                                          data-rank=""
                                                          data-cost="" 
                                                          data-discipline="${cardDiscipline}">
                                                      </div>
                                                  </div>`,
                        cardEfficacy,
                        cardSupportType,
                        cardSupportDuration;

                    jQuery(clonedCard)
                        .prepend(cardBody)
                        .removeClass('ghostCard');

                    // Further define card attributes
                    (cardEfficacy = jQuery(cardBody)
                        .find('.support-efficacy')
                        .text()),
                        (cardSupportType = jQuery(cardBody)
                            .find('.support-type')
                            .text());
                    cardSupportDuration = jQuery(cardBody)
                        .find('.card-support-motiv')
                        .attr('data-support-duration');

                    // Define card type
                    jQuery(clonedCard)
                        .find('.cardFront')
                        .addClass('support-card-type');
                    if (
                        jQuery(cardBody).find('.support-levelling-effect')
                            .length
                    ) {
                        jQuery(clonedCard)
                            .find('.cardFront')
                            .addClass('levelling-card-type');
                    }

                    // Determine card efficacy
                    if (cardEfficacy == 100) {
                        jQuery(clonedCard)
                            .find('.cardFront')
                            .addClass('peerless-ranking');
                        jQuery(clonedCard)
                            .find('.card-ranking')
                            .prepend(
                                '<i class="far fa-star"></i><i class="far fa-star"></i><i class="far fa-star"></i><i class="far fa-star"></i>'
                            );

                        // Update Rank attribute
                        jQuery(clonedCard)
                            .find('.card-attributes')
                            .attr('data-rank', 'peerless');

                        // TEMP : To be detemined by specific card
                        jQuery(clonedCard)
                            .find('.card-resource-cost')
                            .prepend(
                                `<div class="resource-cost" data-resource-cost="5">
                                          <i class="fas fa-circle"></i>
                                          <i class="fas fa-circle"></i>
                                          <i class="fas fa-circle"></i>
                                          <i class="fas fa-circle"></i>
                                          <i class="fas fa-circle"></i>
                                      </div>`
                            );

                        // Update Support Cost attribute
                        jQuery(clonedCard)
                            .find('.card-attributes')
                            .attr('data-cost', '5');
                    } else if (cardEfficacy >= 90 && cardEfficacy != 100) {
                        jQuery(clonedCard)
                            .find('.cardFront')
                            .addClass('elite-ranking');
                        jQuery(clonedCard)
                            .find('.card-ranking')
                            .prepend(
                                '<i class="fas fa-star"></i><i class="fas fa-star"></i><i class="fas fa-star"></i>'
                            );

                        // Update Rank attribute
                        jQuery(clonedCard)
                            .find('.card-attributes')
                            .attr('data-rank', 'elite');

                        // TEMP : To be detemined by specific card
                        jQuery(clonedCard)
                            .find('.card-resource-cost')
                            .prepend(
                                `<div class="resource-cost" data-resource-cost="4">
                                          <i class="fas fa-circle"></i>
                                          <i class="fas fa-circle"></i>
                                          <i class="fas fa-circle"></i>
                                          <i class="fas fa-circle"></i>
                                          <i class="far fa-circle"></i>
                                      </div>`
                            );

                        // Update Support Cost attribute
                        jQuery(clonedCard)
                            .find('.card-attributes')
                            .attr('data-cost', '4');
                    } else if (cardEfficacy >= 80 && cardEfficacy < 90) {
                        jQuery(clonedCard)
                            .find('.cardFront')
                            .addClass('adept-ranking');
                        jQuery(clonedCard)
                            .find('.card-ranking')
                            .prepend(
                                '<i class="fas fa-star"></i><i class="fas fa-star"></i>'
                            );

                        // Update Rank attribute
                        jQuery(clonedCard)
                            .find('.card-attributes')
                            .attr('data-rank', 'adept');

                        // TEMP : To be detemined by specific card
                        jQuery(clonedCard)
                            .find('.card-resource-cost')
                            .prepend(
                                `<div class="resource-cost" data-resource-cost="3">
                                          <i class="fas fa-circle"></i>
                                          <i class="fas fa-circle"></i>
                                          <i class="fas fa-circle"></i>
                                          <i class="far fa-circle"></i>
                                          <i class="far fa-circle"></i>
                                      </div>`
                            );

                        // Update Support Cost attribute
                        jQuery(clonedCard)
                            .find('.card-attributes')
                            .attr('data-cost', '3');
                    } else if (cardEfficacy >= 70 && cardEfficacy < 80) {
                        jQuery(clonedCard)
                            .find('.cardFront')
                            .addClass('proficient-ranking');
                        jQuery(clonedCard)
                            .find('.card-ranking')
                            .prepend('<i class="fas fa-star"></i>');

                        // Update Rank attribute
                        jQuery(clonedCard)
                            .find('.card-attributes')
                            .attr('data-rank', 'proficient');

                        // TEMP : To be detemined by specific card
                        jQuery(clonedCard)
                            .find('.card-resource-cost')
                            .prepend(
                                `<div class="resource-cost" data-resource-cost="2">
                                          <i class="fas fa-circle"></i>
                                          <i class="fas fa-circle"></i>
                                          <i class="far fa-circle"></i>
                                          <i class="far fa-circle"></i>
                                          <i class="far fa-circle"></i>
                                      </div>`
                            );

                        // Update Support Cost attribute
                        jQuery(clonedCard)
                            .find('.card-attributes')
                            .attr('data-cost', '2');
                    } else if (cardEfficacy >= 15 && cardEfficacy < 70) {
                        jQuery(clonedCard)
                            .find('.cardFront')
                            .addClass('neophyte-ranking');

                        // Update Rank attribute
                        jQuery(clonedCard)
                            .find('.card-attributes')
                            .attr('data-rank', 'neophyte');

                        // TEMP : To be detemined by specific card
                        jQuery(clonedCard)
                            .find('.card-resource-cost')
                            .prepend(
                                `<div class="resource-cost" data-resource-cost="1">
                                          <i class="fas fa-circle"></i>
                                          <i class="far fa-circle"></i>
                                          <i class="far fa-circle"></i>
                                          <i class="far fa-circle"></i>
                                          <i class="far fa-circle"></i>
                                      </div>`
                            );

                        // Update Support Cost attribute
                        jQuery(clonedCard)
                            .find('.card-attributes')
                            .attr('data-cost', '1');
                    }

                    // Determine support card type
                    if (
                        cardSupportType == 'Battle' ||
                        cardSupportType == 'Strategic'
                    ) {
                        // apply disciplines to strategic or battle type support cards

                        // Determine discipline type
                        if (cardDiscipline == 'terra') {
                            jQuery(clonedCard)
                                .find('.cardFront')
                                .addClass('terra-motiv');
                            jQuery(clonedCard)
                                .find('.card-elemental-motif')
                                .prepend('<i class="fas fa-mountain"></i>');
                            jQuery(clonedCard)
                                .find('.card-discipline')
                                .prepend(cardDiscipline);
                        } else if (cardDiscipline == 'aero') {
                            jQuery(clonedCard)
                                .find('.cardFront')
                                .addClass('aero-motiv');
                            jQuery(clonedCard)
                                .find('.card-elemental-motif')
                                .prepend('<i class="fas fa-cloud-bolt"></i>');
                            jQuery(clonedCard)
                                .find('.card-discipline')
                                .prepend(cardDiscipline);
                        } else if (cardDiscipline == 'hydro') {
                            jQuery(clonedCard)
                                .find('.cardFront')
                                .addClass('hydro-motiv');
                            jQuery(clonedCard)
                                .find('.card-elemental-motif')
                                .prepend('<i class="fas fa-droplet"></i>');
                            jQuery(clonedCard)
                                .find('.card-discipline')
                                .prepend(cardDiscipline);
                        } else if (cardDiscipline == 'pyro') {
                            jQuery(clonedCard)
                                .find('.cardFront')
                                .addClass('pyro-motiv');
                            jQuery(clonedCard)
                                .find('.card-elemental-motif')
                                .prepend('<i class="fas fa-fire"></i>');
                            jQuery(clonedCard)
                                .find('.card-discipline')
                                .prepend(cardDiscipline);
                        }
                    }

                    // Determine support duration
                    if (cardSupportDuration == 'epheremal') {
                        jQuery(
                            '<div class="card-support-duration"><i class="fas fa-exchange-alt"></i></div>'
                        ).insertAfter(
                            jQuery(clonedCard).find(
                                '.cardFront .card-discipline'
                            )
                        );
                    } else if (cardSupportDuration == 'perennial') {
                        jQuery(
                            '<div class="card-support-duration"><i class="fas fa-redo"></i></div>'
                        ).insertAfter(
                            jQuery(clonedCard).find(
                                '.cardFront .card-discipline'
                            )
                        );
                    }
                }
            }
        }, 250);
    }, 500);
}

/*
 **
 ** Draw Phase
 **
 */
let playerHand, // prepare reference variable
    fieldInContext,
    cardsInStandbyDeck;

function beginDrawPhase() {
    if (drawPhase) {
        if (playerTurn) {
            Player_Session = true;

            // player start
            playerHand = jQuery('[data-field="player-field"]');
            fieldInContext = jQuery(playerHand).attr('data-field');
            drawCards(playerHand);
        } else if (!playerTurn) {
            AI_Session = true;

            // AI start
            playerHand = jQuery('[data-field="ai-field"]');
            fieldInContext = jQuery(playerHand).attr('data-field');
            drawCards(playerHand);
        }
    }
}

// Notify of invalid draw then redraw
function invalidDraw(playerHand) {
    invalidDrawNotice = true; // allow key selection

    dialogueBoxContent = `<div class="invalid-draw-notice">
                                      <div class="dialogue-box-notice-emphasis">Invalid Draw</div>
                                      <div class="dialogue-box-notice-detail">
                                          No valid caster cards detected.
                                      </div>
                                  </div>`;

    if (jQuery('.dialogueBox .dialogueBox-body').children().length === 0) {
        // prevent additional prepending by excessive user input
        jQuery('.dialogueBox .dialogueBox-body').prepend(dialogueBoxContent);
    }

    // call dialogue box
    toggleDialogueBox(false, true);

    setTimeout(function () {
        // auto dismiss after delay

        // is the turn selection phase still active?
        if (invalidDrawNotice) {
            toggleDialogueBox(false, false);

            discardCards(playerHand);

            if (Player_Session) {
                // Update and display phase guide
                guideInstruction =
                    'Discarding Cards...<br> <small>A new hand will be drawn</small>';
                updatePhaseGuide(guideInstruction, currentPhase);
            } else if (AI_Session) {
                // Update and display phase guide
                guideInstruction = 'Discarding Cards...';
                updatePhaseGuide(guideInstruction, currentPhase);
            }
        }
    }, 2000);
}

// Dismiss invalid Draw Notice
function dismissInvalidDrawNotice() {
    invalidDrawNotice = false;

    discardCards(playerHand);

    if (Player_Session) {
        // Update and display phase guide
        guideInstruction =
            'Discarding Cards...<br> <small>A new hand will be drawn</small>';
        updatePhaseGuide(guideInstruction, currentPhase);
    } else if (AI_Session) {
        // Update and display phase guide
        guideInstruction = 'Discarding Cards...';
        updatePhaseGuide(guideInstruction, currentPhase);
    }
}

// Confirm or discard hand
function handConfirmation(playerHand) {
    dialogueBoxContent = `<div class="confirmation-prompt">
                            Confirm Draw
                            <div class="confirm-options">
                                <div class="btn btn-confirm focus" data-confirm="true">Accept Hand</div>
                                <div class="btn btn-confirm" data-confirm="false">Discard Hand</div>
                                <div class="btn btn-confirm" data-confirm="deferred">Browse Hand</div>
                            </div>
                        </div>`;

    if (jQuery('.dialogueBox .dialogueBox-body').children().length === 0) {
        // prevent additional prepending by excessive user input
        jQuery('.dialogueBox .dialogueBox-body').prepend(dialogueBoxContent);
    }

    // call dialogue box
    toggleDialogueBox(true, false);

    handConfirmationPhase = true; // allow key selection
    formerPhase = 'drawPhase';
    currentPhase = 'handConfirmationPhase';

    // Update phase indicator
    updatePhaseIndicator();

    // Dismiss current phase guide
    dismissPhaseGuide();
}

// Determine player confirmation
function determineHandConfirmation(playerHand, handPermanence) {
    // Continue based on condition returned
    if (handPermanence == 'true') {
        // player accepts hand

        // Construct player attributes
        constructPlayerAttributes(true, true); // player, ai

        // end hand confirmation phase, proceed to next phase (caster select phase or resource pool phase)
        toggleDialogueBox(false, false);

        handConfirmationPhase = false; // end hand confirmation phase

        // determine if caster needs to be selected or is already present
        if (!attributesPlayer.hasCasterInPlay) {
            // no caster in play

            casterSelectionPhase = true; // start caster selection phase and allow UI key navigation
            formerPhase = 'handConfirmationPhase';
            currentPhase = 'casterSelectionPhase';

            // Update phase indicator
            updatePhaseIndicator();

            // Update and display phase guide
            guideInstruction = 'Place a valid caster card in play';
            updatePhaseGuide(guideInstruction, currentPhase);

            // Unmark valid selection options
            unmarkValidSelections();

            // Mark valid selection options
            markValidSelections('caster-card-type');

            // Nerf ranking higher than neophyte (proficient 1/2, adept 1/3, elite 1/4, peerless 1/5)
            setTimeout(function () {
                forceNerf();
            }, 500);
        } else {
            // Determine if valid card types are available to pool resources
            const hasCasterType = isCardInHand(
                attributesAI.inHand,
                'cardType',
                'Caster'
            );

            if (hasCasterType) {
                resourcePoolingPhase = true; // start resource pooling phase and allow UI key navigation
                formerPhase = 'handConfirmationPhase';
                currentPhase = 'resourcePoolingPhase';

                // Update phase indicator
                updatePhaseIndicator();

                // Update and display phase guide
                guideInstruction =
                    'Allocate a valid caster card for resource pooling';
                updatePhaseGuide(guideInstruction, currentPhase);

                // Unmark valid selection options
                unmarkValidSelections();

                // Mark valid selection options
                markValidSelections('caster-card-type');

                // Display resource value tags
                displayResourceValueTags();
            } else {
                // TODO : invoke dialogue box to inform player, dismiss after timed delay, proceed to levelling or support selection phase
                console.log(
                    'no available cards to allocate to resource pooling'
                );
            }
        }
    } else if (handPermanence == 'false') {
        // player rejects hand

        toggleDialogueBox(false, false); // dismiss the dialogue box

        handConfirmationPhase = false; // end hand confirmation phase
        drawPhase = true;
        formerPhase = 'handConfirmationPhase';
        currentPhase = 'drawPhase';

        // Update phase indicator
        updatePhaseIndicator();

        // discard current hand
        discardCards(playerHand);

        if (Player_Session) {
            // Update and display phase guide
            guideInstruction =
                'Discarding Cards...<br> <small>A new hand will be drawn</small>';
            updatePhaseGuide(guideInstruction, currentPhase);
        } else if (AI_Session) {
            // Update and display phase guide
            guideInstruction = 'Discarding Cards...';
            updatePhaseGuide(guideInstruction, currentPhase);
        }
    } else if (handPermanence == 'deferred') {
        // player browses hand

        // minimize dialogue box
        toggleDockDialogueBox();
    }
}

// Discard Hand
function discardCards(playerHand) {
    iterationDelay = 300;

    // get co-ordinates and dimensions of the dead pile
    var deadPile = jQuery(playerHand).find('.dead-pile');
    (deadPileOffset = jQuery(deadPile).offset()),
        (deadPileTop = deadPileOffset.top),
        (deadPileLeft = deadPileOffset.left),
        (deadPileWidth = jQuery(deadPile).outerHeight()),
        (deadPileHeight = jQuery(deadPile).outerWidth());

    // Discard cards
    jQuery(playerHand)
        .find('.card-aperture.closed')
        .each(function (i) {
            let current_aperture = jQuery(this);

            setTimeout(function () {
                if (jQuery(current_aperture).hasClass('closed')) {
                    let current_discardingCard =
                            jQuery(current_aperture).find('.card'), // store to variable
                        current_clonedCard;

                    // Open card slot
                    jQuery(current_aperture)
                        .removeClass('closed')
                        .addClass('open');

                    // Epheremal state handler
                    jQuery(current_aperture).addClass('placingCard');

                    // Retrieve co-ordinates and dimensions of card aperture
                    var cardApertureOffset = jQuery(current_aperture).offset(),
                        cardApertureTop = cardApertureOffset.top,
                        cardApertureLeft = cardApertureOffset.left;

                    // Set relative co-ordinates
                    var relativeTop = deadPileTop - cardApertureTop,
                        relativeLeft = deadPileLeft - cardApertureLeft;

                    // Discarding card
                    jQuery(current_discardingCard)
                        .addClass('idleCard scaleSmall speedX3')
                        .removeClass('activeCard');
                    jQuery(current_discardingCard).removeClass(function (
                        index,
                        className
                    ) {
                        // remove the clone iteration reference
                        return (
                            className.match(/(^|\s)clone-iteration-\S+/g) || []
                        ).join(' ');
                    });
                    jQuery(current_discardingCard).css({
                        top: relativeTop,
                        left: relativeLeft,
                        width: deadPileWidth,
                        height: deadPileHeight,
                    }); // in motion
                    jQuery(current_discardingCard)
                        .clone()
                        .appendTo(deadPile)
                        .removeClass('speedX3')
                        .addClass('ghostCard deadCard discard-iteration-' + i); // clone the modified card and add to dead pile
                    current_clonedCard = jQuery('.discard-iteration-' + i);

                    setTimeout(function () {
                        jQuery(current_discardingCard).remove();
                        jQuery(current_clonedCard).css({ top: '0', left: '0' }); // lock in position
                        jQuery(current_clonedCard).removeClass('ghostCard');
                        jQuery(current_aperture).removeClass('placingCard');
                    }, 300);

                    // Redraw if hand is cleared
                    remainingIterations = jQuery(playerHand).find(
                        '.card-aperture.closed'
                    ).length;

                    if (remainingIterations <= 0) {
                        // allow delay for final card to clear hand

                        setTimeout(function () {
                            // ...then draw new hand

                            cardsInStandbyDeck = checkForRemainingCardsInDeck(
                                playerHand,
                                player_standbyDeck
                            );

                            if (cardsInStandbyDeck) {
                                // draw a new hand
                                drawCards(playerHand);
                            } else {
                                // empty standby deck
                                console.log(
                                    'no cards detected in standby deck'
                                );
                            }
                        }, 500);
                    }
                }
            }, iterationDelay);

            iterationDelay += 300;
        });
}

// draw hand
function drawCards(playerHand) {
    cardsInStandbyDeck = checkForRemainingCardsInDeck(
        playerHand,
        player_standbyDeck
    );

    var idleCard = '<div class="card idleCard">' + cardBack + '</div>',
        stackCount = player_standbyDeck.length;

    if (cardsInStandbyDeck) {
        if (Player_Session) {
            // Update and display phase guide
            guideInstruction =
                'Drawing Cards...<br> <small>Accept, reject or browse hand drawn.</small>';
            updatePhaseGuide(guideInstruction, currentPhase);
        } else if (AI_Session) {
            // Update and display phase guide
            guideInstruction = 'Drawing Cards...';
            updatePhaseGuide(guideInstruction, currentPhase);
        }

        if (jQuery(playerHand).find('.standby-pile .idleCard').length <= 0) {
            jQuery(playerHand).find('.standby-pile').prepend(idleCard);
        }

        // Set stack counter
        jQuery(playerHand).find('.stack-counter span').text(stackCount);

        var cardsInStandbyDeckCard_offset = jQuery(playerHand)
                .find('.standby-pile .card')
                .offset(),
            cardsInStandbyDeckCard_top = cardsInStandbyDeckCard_offset.top,
            cardsInStandbyDeckCard_left = cardsInStandbyDeckCard_offset.left,
            cardsInStandbyDeckCard_width = jQuery(playerHand)
                .find('.standby-pile .card')
                .outerWidth(),
            cardsInStandbyDeckCard_height = jQuery(playerHand)
                .find('.standby-pile .card')
                .outerHeight();

        jQuery(playerHand)
            .find('.standby-pile .card')
            .css('position', 'absolute');

        iterationDelay = 200;

        // Retrieve co-ordinates and dimensions of card aperture
        var cardApertureOffset,
            cardApertureTop,
            cardApertureLeft,
            cardApertureWidth,
            cardApertureHeight;

        // Draw cards
        jQuery(
            Player_Session
                ? jQuery(playerHand).find('.card-aperture.open').get().reverse()
                : jQuery(playerHand).find('.card-aperture.open')
        ).each(function (i) {
            let current_aperture = jQuery(this);

            setTimeout(function () {
                if (jQuery(current_aperture).hasClass('open')) {
                    // Retrieve co-ordinates and dimensions of open card aperture
                    cardApertureOffset = jQuery(current_aperture).offset();
                    cardApertureTop = cardApertureOffset.top;
                    cardApertureLeft = cardApertureOffset.left;
                    cardApertureWidth = jQuery(current_aperture).outerWidth();
                    cardApertureHeight = jQuery(current_aperture).outerHeight();

                    // Set relative co-ordinates
                    var relativeTop =
                            cardsInStandbyDeckCard_top - cardApertureTop,
                        relativeLeft =
                            cardsInStandbyDeckCard_left - cardApertureLeft;

                    // Check for remaining cards in standby deck
                    if (cardsInStandbyDeck) {
                        // Draw the last card in the deck array
                        let cardDetails = player_standbyDeck.pop(), // remove the last value from array (top card of standby deck)
                            current_activeCard,
                            current_clonedCard,
                            playerActiveHand =
                                jQuery(playerHand).find('.player-hand');

                        // Draw Preparation
                        jQuery(playerHand)
                            .find('.standby-pile .idleCard')
                            .clone()
                            .appendTo(playerActiveHand)
                            .addClass('drawing-iteration-' + i)
                            .attr('data-iteration', i); // assign active state to standby card

                        current_activeCard = jQuery(playerHand).find(
                            '.drawing-iteration-' + i
                        ); // store to variable

                        jQuery(current_activeCard).css({
                            top: cardsInStandbyDeckCard_top,
                            left: cardsInStandbyDeckCard_left,
                            height: cardsInStandbyDeckCard_width,
                            width: cardsInStandbyDeckCard_height,
                            'z-index': '9',
                        }); // position standby card

                        // Update stack counter
                        stackCount = player_standbyDeck.length;
                        jQuery(playerHand)
                            .find('.stack-counter span')
                            .text(stackCount);

                        // Check remaining standby card count
                        if (stackCount <= 10) {
                            jQuery(playerHand)
                                .find('.stack-counter')
                                .addClass('stack-count-low');
                        }

                        // Drawing card
                        setTimeout(function () {
                            // allow for a small delay for standby positioning to establish

                            jQuery(current_activeCard)
                                .removeClass('idleCard')
                                .addClass('activeCard')
                                .css({
                                    top: cardApertureTop,
                                    left: cardApertureLeft,
                                    width: cardApertureWidth,
                                    height: cardApertureHeight,
                                }); // in motion
                            jQuery(current_activeCard)
                                .clone()
                                .appendTo(current_aperture)
                                .removeClass(
                                    'activeCard drawing-iteration-' + i
                                )
                                .addClass('ghostCard clone-iteration-' + i); // clone the modified card and add to open aperture
                            current_clonedCard = jQuery(playerHand).find(
                                '.clone-iteration-' + i
                            );
                            jQuery(current_clonedCard).css({
                                top: '0',
                                left: '0',
                            }); // lock in position

                            // Reveal drawn card
                            revealDrawnCard(
                                current_activeCard,
                                current_clonedCard,
                                cardDetails
                            );
                        }, 100);

                        // Close card slot
                        jQuery(current_aperture)
                            .removeClass('open')
                            .addClass('closed');

                        // Check if it was the last card
                        checkForRemainingCardsInDeck(
                            playerHand,
                            player_standbyDeck
                        );
                    } else {
                        // Empty standby deck
                        console.log('no cards detected in standby deck');
                    }
                }

                // Prompt hand confirmation
                if (
                    jQuery(playerHand).find('.card-aperture.open').length <=
                        0 &&
                    stackCount >= 1
                ) {
                    setTimeout(function () {
                        // Construct player attributes
                        constructPlayerAttributes(true, true); // player, ai

                        if (Player_Session) {
                            var hasCasterType = isCardInHand(
                                attributesPlayer.inHand,
                                'cardType',
                                'Caster'
                            );

                            // Check for valid caster type cards
                            if (hasCasterType) {
                                // valid caster type found

                                setTimeout(function () {
                                    drawPhase = false; // end draw phase

                                    // Confirm hand or discard all to draw again
                                    handConfirmation(playerHand);
                                }, 200);

                                // Validate hand after draw
                            } else {
                                // no valid caster type found

                                setTimeout(function () {
                                    drawPhase = false; // end draw phase

                                    // Notify player beforing discarding hand and redrawing
                                    invalidDraw(playerHand);
                                }, 200);
                            }
                        } else if (AI_Session) {
                            // AI automated operations

                            // TODO : implement advanced acceptation parameters and conditions (where hand may still be discarded even if caster cards are present to play)
                            var hasCasterType = isCardInHand(
                                attributesAI.inHand,
                                'cardType',
                                'Caster'
                            );

                            // Check for valid caster type cards
                            if (hasCasterType) {
                                // valid caster type found

                                setTimeout(function () {
                                    drawPhase = false; // end draw phase

                                    // determine if caster needs to be selected or is already present
                                    if (!attributesAI.hasCasterInPlay) {
                                        // no caster in play

                                        casterSelectionPhase = true;
                                        formerPhase = 'handConfirmationPhase';
                                        currentPhase = 'casterSelectionPhase';

                                        // Update phase indicator
                                        updatePhaseIndicator();

                                        // Unmark valid selection options
                                        unmarkValidSelections();

                                        // Mark valid selection options
                                        markValidSelections('caster-card-type');

                                        // Nerf ranking higher than neophyte (proficient 1/2, adept 1/3, elite 1/4, peerless 1/5)
                                        setTimeout(function () {
                                            forceNerf();
                                        }, 500);

                                        // AI caster selection
                                        setTimeout(function () {
                                            AIcasterSelection(playerHand);
                                        }, 1000);
                                    } else {
                                        // Determine if valid card types are available to pool resources
                                        //if(jQuery(playerHand).find('.caster-card-type').length) {
                                        if (hasCasterType) {
                                            resourcePoolingPhase = true;
                                            formerPhase =
                                                'handConfirmationPhase';
                                            currentPhase =
                                                'resourcePoolingPhase';

                                            // Update phase indicator
                                            updatePhaseIndicator();

                                            // Unmark valid selection options
                                            unmarkValidSelections();

                                            // Mark valid selection options
                                            markValidSelections(
                                                'caster-card-type'
                                            );

                                            // Display resource value tags
                                            displayResourceValueTags();

                                            // AI resource selection
                                            setTimeout(function () {
                                                AIresourceSelection(playerHand);
                                            }, 1000);
                                        } else {
                                            // TODO : invoke dialogue box to inform player, dismiss after timed delay, proceed to levelling or support selection phase
                                            console.log(
                                                'no available cards to allocate to resource pooling'
                                            );
                                        }
                                    }
                                }, 200);

                                // Validate hand after draw
                            } else {
                                // no valid caster type found

                                setTimeout(function () {
                                    drawPhase = false; // end draw phase

                                    // Notify player beforing discarding hand and redrawing
                                    invalidDraw(playerHand);
                                }, 200);
                            }
                        }
                    }, 1000);
                } else if (stackCount <= 0) {
                    setTimeout(function () {
                        // Construct player attributes
                        constructPlayerAttributes(true, true); // player, ai

                        // Check for valid caster type cards
                        if (Player_Session) {
                            var hasCasterType = isCardInHand(
                                attributesPlayer.inHand,
                                'cardType',
                                'Caster'
                            );
                        } else if (AI_Session) {
                            var hasCasterType = isCardInHand(
                                attributesAI.inHand,
                                'cardType',
                                'Caster'
                            );
                        }

                        if (hasCasterType) {
                            // valid caster type found

                            drawPhase = false;
                            casterSelectionPhase = true;
                            formerPhase = 'drawPhase';
                            currentPhase = 'casterSelectionPhase';

                            // Update phase indicator
                            updatePhaseIndicator();

                            if (Player_Session) {
                                // Update and display phase guide
                                guideInstruction =
                                    'Place a valid caster card in play';
                                updatePhaseGuide(
                                    guideInstruction,
                                    currentPhase
                                );
                            }

                            // Unmark valid selection options
                            unmarkValidSelections();

                            // Mark valid selection options
                            markValidSelections('caster-card-type');

                            // Nerf ranking higher than neophyte (proficient 1/2, adept 1/3, elite 1/4, peerless 1/5)
                            setTimeout(function () {
                                forceNerf();
                            }, 500);

                            if (AI_Session) {
                                // AI caster selection
                                setTimeout(function () {
                                    AIcasterSelection(playerHand);
                                }, 1000);
                            }

                            // Validate hand after draw
                        } else {
                            // no valid caster type found

                            // TODO : player loses game if no valid caster card is found and there are no more cards to draw
                            console.log('game loss');
                        }
                    }, 1000);
                }
            }, iterationDelay);

            iterationDelay += 200;
        });
    } else {
        jQuery(playerHand).find('.standby-pile').empty();
    }
}

/*
 **
 ** Turn Selection Phase
 **
 */
// Start turn selection phase
if (turnSelectionPhase) {
    var turnSelectionMade = false,
        elArray = ['terra', 'aero', 'hydro', 'pyro'],
        elArrayDesignated = [],
        autoSelection = elArray[Math.floor(Math.random() * elArray.length)], // retrieve random value from array
        playerSelection,
        selectedTurn,
        playerTurn,
        autoDesignation;

    shuffleArray(elArray);

    turnSelect(elArray);

    // imitiate key navigation phase (will remain active and adjust behaviour according to given active states)
    keyNavigation();
}

// End turn selection phase
function endTurnSelectPhase() {
    // Hide, then remove from DOM
    jQuery('.turnCard-component').fadeOut(function () {
        jQuery('.turnCard-component').remove();
    });

    turnSelectionPhase = false; // end turn phase
    drawPhase = true; // start draw phase
    formerPhase = 'turnSelectionPhase';
    currentPhase = 'drawPhase';

    // Update phase indicator
    updatePhaseIndicator();

    beginDrawPhase();
}

function turnSelect(elArray) {
    // Randomly selected turn matching card
    //jQuery('<div></div>').addClass('turnCard turnCard-hidden').attr('data-element',autoSelection).appendTo('.turnCard-match');

    // Designate first x2 elements in array to draw turn matches
    for (var i = 0; i <= 1; i++) {
        jQuery('<div></div>')
            .addClass('turnCard turnCard-hidden')
            .attr('data-element', elArray[i])
            .appendTo('.turnCard-match');

        // Append the turn card back
        jQuery(
            '.turnCard-match .turnCard[data-element="' + elArray[i] + '"]'
        ).append('<div class="card facedownCard">' + cardBack + '</div>');

        switch (elArray[i]) {
            case 'terra':
                jQuery(
                    '.turnCard[data-element="' + elArray[i] + '"] .card'
                ).append(
                    '<div class="cardFront ghostCard"><div class="card"><i class="fas fa-mountain"></i></div></div>'
                );
                break;

            case 'aero':
                jQuery(
                    '.turnCard[data-element="' + elArray[i] + '"] .card'
                ).append(
                    '<div class="cardFront ghostCard"><div class="card"><i class="fas fa-cloud-bolt"></i></div></div>'
                );
                break;

            case 'hydro':
                jQuery(
                    '.turnCard[data-element="' + elArray[i] + '"] .card'
                ).append(
                    '<div class="cardFront ghostCard"><div class="card"><i class="fas fa-droplet"></i></div></div>'
                );
                break;

            case 'pyro':
                jQuery(
                    '.turnCard[data-element="' + elArray[i] + '"] .card'
                ).append(
                    '<div class="cardFront ghostCard"><div class="card"><i class="fas fa-fire"></i></div></div>'
                );
                break;
        }
    }

    // Draw the turn card match
    iterationDelay = 300;

    jQuery('.turnCard-match .turnCard').each(function (i, el) {
        setTimeout(function () {
            jQuery(el)
                .removeClass('turnCard-hidden')
                .addClass('turnCard-drawn');
        }, iterationDelay);

        iterationDelay += 300;
    });

    // Randomly designate turn selection cards
    iterationDelay = 0;
    iterationCount = 0;
    for (var i = 0; i <= 3; i++) {
        autoDesignation = elArray[Math.floor(Math.random() * elArray.length)];
        elArrayDesignated.push(autoDesignation);
        elArray.splice(elArray.indexOf(autoDesignation), 1);

        // Build the turn card wrapper
        jQuery('<div></div>')
            .addClass('turnCard turnCard-hidden')
            .attr({ 'data-element': autoDesignation, 'data-designation': i })
            .prependTo('.turnCard-selection');

        // Append the turn card back
        jQuery('.turnCard[data-designation="' + i + '"]').append(
            '<div class="card facedownCard">' + cardBack + '</div>'
        );

        switch (autoDesignation) {
            case 'terra':
                jQuery('.turnCard[data-designation="' + i + '"] .card').append(
                    '<div class="cardFront"><i class="fas fa-mountain"></i></div>'
                );
                break;

            case 'aero':
                jQuery('.turnCard[data-designation="' + i + '"] .card').append(
                    '<div class="cardFront"><i class="fas fa-cloud-bolt"></i</div>'
                );
                break;

            case 'hydro':
                jQuery('.turnCard[data-designation="' + i + '"] .card').append(
                    '<div class="cardFront"><i class="fas fa-droplet"></i></div>'
                );
                break;

            case 'pyro':
                jQuery('.turnCard[data-designation="' + i + '"] .card').append(
                    '<div class="cardFront"><i class="fas fa-fire"></i></div>'
                );
                break;
        }

        jQuery('.turnCard[data-designation="' + i + '"] .cardFront').addClass(
            'ghostCard'
        );

        // Draw and reveal turn card
        iterationDelay += 300;
        iterationCount += 1;
        drawTurnCard(i, iterationDelay, iterationCount);
    }
}

// Draw turn card selection options
function drawTurnCard(i, iterationDelay, iterationCount) {
    setTimeout(function () {
        setTimeout(function () {
            jQuery('.turnCard[data-designation="' + i + '"]')
                .removeClass('turnCard-hidden')
                .addClass('turnCard-drawn');

            revealTurnCard(i);

            if (iterationCount >= 4) {
                // allow delay for final card to reveal

                setTimeout(function () {
                    // ...then apply to first card in set

                    if (
                        !jQuery('.turnCard-selection .turnCard').hasClass(
                            'focus'
                        )
                    ) {
                        // ...if this class doesn't alreaddy exist on a card

                        jQuery('.turnCard-selection')
                            .find('.turnCard')
                            .first()
                            .addClass('focus');
                    }

                    // Update and display phase guide
                    guideInstruction =
                        'Choose a card. You draw first if it matches any face-down card';
                    updatePhaseGuide(guideInstruction, currentPhase);
                }, 1000);
            }
        }, 300);
    }, iterationDelay);
}

// Reveal turn card selection options
function revealTurnCard(i) {
    var drawnTurnCard = jQuery('.turnCard[data-designation="' + i + '"] .card');

    setTimeout(function () {
        jQuery(drawnTurnCard)
            .removeClass('facedownCard')
            .addClass('flippedCard');

        setTimeout(function () {
            jQuery(drawnTurnCard).removeClass('flippedCard');
            jQuery(drawnTurnCard).find('.cardFront').removeClass('ghostCard');
            jQuery(drawnTurnCard).find('.cardBack').remove();
        }, 150);
    }, 500);
}

// Select with mouse
jQuery('.turnCard-component .turnCard-selection').on(
    'click',
    '.turnCard',
    function () {
        if (!turnSelectionMade) {
            if (!jQuery(this).hasClass('focus')) {
                jQuery('.turnCard').removeClass('focus');
                jQuery(this).addClass('focus');
            }

            playerSelection = jQuery(this).attr('data-element');
            turnSelectionMade = true;

            determineTurnOutcome();
        }
    }
);
jQuery('.turnCard-component .turnCard-selection').on(
    'mouseover',
    '.turnCard',
    function () {
        if (!turnSelectionMade) {
            jQuery('.turnCard').removeClass('focus');
            jQuery(this).addClass('focus');
        }
    }
);

// Select with keys
function keyTurnSelect() {
    if (!turnSelectionMade) {
        playerSelection = jQuery('.turnCard.focus').attr('data-element');
        turnSelectionMade = true;

        determineTurnOutcome();
    }
}

// Is the player going first or is the AI going first?
function determineTurnOutcome() {
    // Repopulate emptied array with turn matching card elements to match against
    jQuery('.turnCard-match .turnCard').each(function () {
        elArray.push(jQuery(this).attr('data-element'));
    });

    if (playerSelection == elArray[0] || playerSelection == elArray[1]) {
        selectedTurn = 'first';
        playerTurn = true;
        // Set turn indicator
        jQuery('[data-field="player-field"] .turn-indicator').addClass(
            'activeTurn'
        );
    } else {
        switchActiveSessions(); // switch to AI session

        selectedTurn = 'second';
        playerTurn = false;
        // Set turn indicator
        jQuery('[data-field="ai-field"] .turn-indicator').addClass(
            'activeTurn'
        );
    }

    // determine player turn and generate dialogue box content
    if (playerTurn) {
        dialogueBoxContent = `<div class="turn-result">
                                          1<sup>st</sup> Draw
                                          <div class="turn-order">You draw first & attack second</div>
                                      </div>`;
    } else {
        dialogueBoxContent = `<div class="turn-result">
                                          2<sup>nd</sup> Draw
                                          <div class="turn-order">You draw second & attack first</div>
                                      </div>`;
    }
    if (jQuery('.dialogueBox .dialogueBox-body').children().length === 0) {
        // prevent additional prepending by excessive user input
        jQuery('.dialogueBox .dialogueBox-body').prepend(dialogueBoxContent);
    }

    // Reveal turn card match
    var drawnTurnCardMatch = jQuery('.turnCard-match .turnCard');

    (iterationDelay = 500), (iterationCount = 1);

    jQuery(drawnTurnCardMatch).each(function (i, el) {
        setTimeout(function () {
            jQuery(el).removeClass('facedownCard').addClass('flippedCard');

            setTimeout(function () {
                jQuery(el).removeClass('flippedCard');
                jQuery(el).find('.cardFront').removeClass('ghostCard');
                jQuery(el).find('.cardBack').remove();

                if (iterationCount < 2) {
                    iterationCount++;
                } else {
                    setTimeout(function () {
                        // call dialogue box
                        toggleDialogueBox(false, true);

                        setTimeout(function () {
                            // auto dismiss after delay

                            // is the turn selection phase still active?
                            if (turnSelectionPhase) {
                                toggleDialogueBox(false, false);
                            }
                        }, 2000);
                    }, 300);
                }
            }, 150);
        }, iterationDelay);

        iterationDelay += 300;
    });
}

/*
 **
 ** Selection Phases
 **
 */
var casterSelection,
    resourceSelection,
    supportSelection,
    playerField,
    aiField,
    cardAperture;

// Mark valid selections
function markValidSelections(validType) {
    if (Player_Session) {
        playerField = 'player-field';
    } else if (AI_Session) {
        playerField = 'ai-field';
    }

    jQuery('[data-field="' + playerField + '"] .card-aperture').each(
        function () {
            if (jQuery(this).find('.cardFront').hasClass(validType)) {
                jQuery(this).addClass(
                    'valid-for-selection emphasize-selection'
                );
            } else {
                jQuery(this).addClass('invalid-for-selection');
            }
        }
    );

    setTimeout(function () {
        jQuery('.valid-for-selection').removeClass('emphasize-selection');
    }, 300);
}

// Unmark valid selections
function unmarkValidSelections() {
    if (Player_Session) {
        playerField = 'player-field';
    } else if (AI_Session) {
        playerField = 'ai-field';
    }

    jQuery('[data-field="' + playerField + '"] .card-aperture').each(
        function () {
            jQuery(this).removeClass(
                'valid-for-selection invalid-for-selection'
            );
        }
    );
}

// Select with mouse
jQuery('.player-hand').on('click', '.valid-for-selection', function () {
    if (Player_Session) {
        if (jQuery('.preview-pane-component.inView').length) {
            // if the preview selection pane is still in view...

            // Dismiss preview pane
            jQuery('.preview-pane-component')
                .removeClass('inView')
                .addClass('preview-pane-delay');

            // Remove delay
            setTimeout(function () {
                jQuery('.preview-pane-component').removeClass(
                    'preview-pane-delay'
                );
            }, 1000);
        }

        if (jQuery('.minimized-dialogueBox').length) {
            // if dialogue box is docked, clear in preparation for next dialogue box...
            toggleDialogueBox();
        }

        // Determine phase and progress
        if (casterSelectionPhase || formerPhase == 'casterSelectionPhase') {
            keySelectCaster();
        } else if (
            resourcePoolingPhase ||
            formerPhase == 'resourcePoolingPhase'
        ) {
            keySelectResource();
        } else if (
            supportLevellingPhase ||
            formerPhase == 'supportLevellingPhase' ||
            formerPhase == 'supportConfirmationPhase'
        ) {
            keySelectSupport();
        } else if (levellingPhase || formerPhase == 'levellingPhase') {
            keySelectCaster();
        } else if (
            supportSelectionPhase ||
            formerPhase == 'supportSelectionPhase' ||
            formerPhase == 'supportConfirmationPhase'
        ) {
            keySelectSupport();
        }
    }
});
jQuery('.player-hand').on('mouseover', '.card-aperture', function () {
    if (Player_Session) {
        jQuery('.card-aperture').removeClass('focus');
        jQuery(this).addClass('focus');
    }
});

// Nerf ranking higher than neophyte (proficient 1/2, adept 1/3, elite 1/4, peerless 1/5)
function forceNerf() {
    var checkRank = jQuery(playerHand).find('.valid-for-selection'),
        nerfHalf = '&#189;',
        nerfThird = '&#8531;',
        nerfFourth = '&#188;',
        nerfFifth = '&#8533;',
        naturalForce,
        nerfedForce,
        adjustedForce;

    // Nerf force by ranking
    jQuery(checkRank).each(function (i) {
        if (jQuery(this).find('.cardFront').hasClass('proficient-ranking')) {
            jQuery(this).addClass('caster-nerfed');

            nerfedForce = Number(jQuery(this).find('.card-force').text());

            nerfedForce = Math.ceil(nerfedForce / 2);
            naturalForce = jQuery(this).find('.card-force').text();
            adjustedForce =
                '<div class="card-force-nerf ghostEl"><strike>' +
                naturalForce +
                '</strike><span>' +
                nerfedForce +
                '<i class="fas fa-arrow-turn-down"></i></span></div>';

            // Adjust card force
            jQuery(this)
                .find('.card-force')
                .addClass('card-force-nerfed')
                .empty()
                .prepend(adjustedForce);
            jQuery(this)
                .find('.card-force-indicator svg')
                .clone()
                .prependTo(jQuery(this).find('.card-force-indicator'))
                .addClass('natural-force');
            jQuery(this)
                .find('.card-force-indicator svg:not(.natural-force) circle')
                .css('stroke-dasharray', nerfedForce + ' 100');

            // Display nerf fraction
            jQuery(this)
                .find('.card-marker')
                .prepend(
                    '<div class="card-force-fraction-deduction ghostEl"><i class="fas fa-arrow-down"></i><span>' +
                        nerfHalf +
                        '</span></div>'
                );
        } else if (jQuery(this).find('.cardFront').hasClass('adept-ranking')) {
            jQuery(this).addClass('caster-nerfed');

            nerfedForce = Number(jQuery(this).find('.card-force').text());

            nerfedForce = Math.ceil(nerfedForce / 3);
            naturalForce = jQuery(this).find('.card-force').text();
            adjustedForce =
                '<div class="card-force-nerf ghostEl"><strike>' +
                naturalForce +
                '</strike><span>' +
                nerfedForce +
                '<i class="fas fa-arrow-turn-down"></i></span></div>';

            // Adjust card force
            jQuery(this)
                .find('.card-force')
                .addClass('card-force-nerfed')
                .empty()
                .prepend(adjustedForce);
            jQuery(this)
                .find('.card-force-indicator svg')
                .clone()
                .prependTo(jQuery(this).find('.card-force-indicator'))
                .addClass('natural-force');
            jQuery(this)
                .find('.card-force-indicator svg:not(.natural-force) circle')
                .css('stroke-dasharray', nerfedForce + ' 100');

            // Display nerf fraction
            jQuery(this)
                .find('.card-marker')
                .prepend(
                    '<div class="card-force-fraction-deduction ghostEl"><i class="fas fa-arrow-down"></i><span>' +
                        nerfThird +
                        '</span></div>'
                );
        } else if (jQuery(this).find('.cardFront').hasClass('elite-ranking')) {
            jQuery(this).addClass('caster-nerfed');

            nerfedForce = Number(jQuery(this).find('.card-force').text());

            nerfedForce = Math.ceil(nerfedForce / 4);
            naturalForce = jQuery(this).find('.card-force').text();
            adjustedForce =
                '<div class="card-force-nerf ghostEl"><strike>' +
                naturalForce +
                '</strike><span>' +
                nerfedForce +
                '<i class="fas fa-arrow-turn-down"></i></span></div>';

            // Adjust card force
            jQuery(this)
                .find('.card-force')
                .addClass('card-force-nerfed')
                .empty()
                .prepend(adjustedForce);
            jQuery(this)
                .find('.card-force-indicator svg')
                .clone()
                .prependTo(jQuery(this).find('.card-force-indicator'))
                .addClass('natural-force');
            jQuery(this)
                .find('.card-force-indicator svg:not(.natural-force) circle')
                .css('stroke-dasharray', nerfedForce + ' 100');

            // Display nerf fraction
            jQuery(this)
                .find('.card-marker')
                .prepend(
                    '<div class="card-force-fraction-deduction ghostEl"><i class="fas fa-arrow-down"></i><span>' +
                        nerfFourth +
                        '</span></div>'
                );
        } else if (
            jQuery(this).find('.cardFront').hasClass('peerless-ranking')
        ) {
            jQuery(this).addClass('caster-nerfed');

            nerfedForce = Number(jQuery(this).find('.card-force').text());

            nerfedForce = Math.ceil(nerfedForce / 5);
            naturalForce = jQuery(this).find('.card-force').text();
            adjustedForce =
                '<div class="card-force-nerf ghostEl"><strike>' +
                naturalForce +
                '</strike><span>' +
                nerfedForce +
                '<i class="fas fa-arrow-turn-down"></i></span></div>';

            // Adjust card force
            jQuery(this)
                .find('.card-force')
                .addClass('card-force-nerfed')
                .empty()
                .prepend(adjustedForce);
            jQuery(this)
                .find('.card-force-indicator svg')
                .clone()
                .prependTo(jQuery(this).find('.card-force-indicator'))
                .addClass('natural-force');
            jQuery(this)
                .find('.card-force-indicator svg:not(.natural-force) circle')
                .css('stroke-dasharray', nerfedForce + ' 100');

            // Display nerf fraction
            jQuery(this)
                .find('.card-marker')
                .prepend(
                    '<div class="card-force-fraction-deduction ghostEl"><i class="fas fa-arrow-down"></i><span>' +
                        nerfFifth +
                        '</span></div>'
                );
        }
    });

    setTimeout(function () {
        jQuery(checkRank).find('.ghostEl').removeClass('ghostEl');
    }, 100);
}

// Remove force nerfs
function restoreForce() {
    var nerfedCard = jQuery(playerHand).find('.player-hand .caster-nerfed'),
        nerfedCardCount = jQuery(nerfedCard).length,
        restoreForce;

    iterationDelay = 200;

    jQuery(nerfedCard).each(function (i, el) {
        i++;

        setTimeout(function () {
            // Remove fraction deduction
            jQuery(el)
                .find('.card-force-fraction-deduction')
                .fadeOut(100, function () {
                    jQuery(el).find('.card-force-fraction-deduction').remove();
                });

            // Restore force indicator
            restoreForce = jQuery(el).find('.card-force-nerfed strike').text();
            jQuery(el)
                .find('.card-force-indicator svg:not(.natural-force) circle')
                .css('stroke-dasharray', restoreForce + ', 100');

            // Restore natural force
            jQuery(el)
                .find('.card-force-nerfed span')
                .fadeOut(100, function () {
                    jQuery(el)
                        .find('.card-force-nerfed span')
                        .text(restoreForce)
                        .prependTo(jQuery(el).find('.card-force-nerfed'));
                    jQuery(el).find('.card-force-nerf').remove();
                });
            jQuery(el)
                .find('.card-force strike, .card-force .fas')
                .fadeOut(100)
                .remove();

            if (i == nerfedCardCount) {
                setTimeout(function () {
                    jQuery(nerfedCard)
                        .find('.card-force')
                        .removeClass('card-force-nerfed')
                        .children()
                        .fadeIn();
                    jQuery(nerfedCard)
                        .find('.card-force-indicator .natural-force')
                        .remove();
                    jQuery(nerfedCard).removeClass('caster-nerfed');
                }, 200);
            }
        }, iterationDelay);

        iterationDelay += 200;
    });
}

/*
 **
 ** Caster Selection Phase
 **
 */

// Select with keys
function keySelectCaster() {
    if (casterSelectionPhase || previewSelectionPhase || levellingPhase) {
        if (!jQuery('.valid-for-selection').length) {
            // if no valid cards have been marked yet...

            // Unmark valid selection options
            unmarkValidSelections();

            // Mark valid selection options
            markValidSelections('caster-card-type');
        }

        if (jQuery('.preview-pane-component.inView').length) {
            // if the preview selection pane is still in view...

            // Dismiss preview pane
            jQuery('.preview-pane-component')
                .removeClass('inView')
                .addClass('preview-pane-delay');

            // Remove delay
            setTimeout(function () {
                jQuery('.preview-pane-component').removeClass(
                    'preview-pane-delay'
                );
            }, 1000);
        }

        if (jQuery('.minimized-dialogueBox').length) {
            // if dialogue box is docked, clear in preparation for next dialogue box...
            toggleDialogueBox();
        }

        cardAperture = jQuery('.valid-for-selection.focus');
        jQuery(cardAperture).find('.card').addClass('casterSelection');

        casterSelection = jQuery('.casterSelection');
        playerField = jQuery('.activeTurn')
            .closest('.field')
            .attr('data-field');

        confirmCasterSelection(casterSelection, playerField, cardAperture);
    }
}

// Prompt player to confirm selection
function confirmCasterSelection(casterSelection, playerField, cardAperture) {
    // Move to in-play field
    placeInPlay(casterSelection, playerField, cardAperture);
    jQuery(cardAperture)
        .removeClass('focus closed valid-for-selection')
        .addClass('open');

    setTimeout(function () {
        dialogueBoxContent = `<div class="confirmation-prompt">
                                Confirm Selection
                                <div class="confirm-options">
                                    <div class="btn btn-confirm focus" data-confirm="true">Accept Caster</div>
                                    <div class="btn btn-confirm" data-confirm="false">Reject Caster</div>
                                </div>
                            </div>`;

        if (jQuery('.dialogueBox .dialogueBox-body').children().length === 0) {
            // prevent additional prepending by excessive user input
            jQuery('.dialogueBox .dialogueBox-body').prepend(
                dialogueBoxContent
            );
        }

        // call dialogue box
        toggleDialogueBox(false, true);
    }, 500);

    // Dismiss the current phase guide
    dismissPhaseGuide();

    if (casterSelectionPhase) {
        casterSelectionPhase = false; // disallow UI key navigation
        formerPhase = 'casterSelectionPhase';
    } else if (previewSelectionPhase) {
        previewSelectionPhase = false; // disallow UI key navigation
        formerPhase = 'previewSelectionPhase';
    } else if (levellingPhase) {
        levellingPhase = false; // disallow UI key navigation
        formerPhase = 'levellingPhase';
    }
    casterConfirmationPhase = true; // allow key selection
    currentPhase = 'casterConfirmationPhase';

    // Update phase indicator
    updatePhaseIndicator();
}

function HPcharge(charge, limit) {
    playerField = jQuery('.activeTurn').closest('.field').attr('data-field');

    iterationDelay = 100;

    if (charge == 'up') {
        jQuery('[data-battle-field="' + playerField + '"] .hitpoint-component')
            .find('.hitpoint-percentile')
            .addClass('activePercentile');

        // Interval loop variables
        var hitpointComponent = jQuery(
                '[data-battle-field="' + playerField + '"] .hitpoint-component'
            ),
            hitpointPercentile = jQuery(hitpointComponent).find(
                '.activePercentile'
            ).length
                ? Number(
                      jQuery(hitpointComponent).find('.activePercentile').text()
                  )
                : 0;
        hitpointPercentileIteration = 0;

        // Timed loop: add x10 hitpoint percentiles for the limit defined
        var intervalID = setInterval(function () {
            if (hitpointPercentileIteration === limit) {
                // clear interval when iteration limit is reached
                clearInterval(intervalID);
            }

            var timeoutID = setTimeout(function () {
                jQuery('.activePercentile').text(hitpointPercentile);
                hitpointPercentile += 10;
            }, 100);

            hitpointPercentileIteration++;
        }, 100);

        // HP charge up
        jQuery(
            jQuery(
                '[data-battle-field="' + playerField + '"] .hitpoint-meter div'
            )
                .get()
                .reverse()
        ).each(function () {
            if (hitpointPercentileIteration === limit) {
                return;
            } // break out of loop if limit is met

            let HPmeter = jQuery(this);

            setTimeout(function () {
                jQuery(HPmeter).addClass('activeIndicator');
            }, iterationDelay);

            iterationDelay += 100;
        });
    } else if (charge == 'down') {
        // Interval loop variables
        var hitpointComponent = jQuery(
                '[data-battle-field="' + playerField + '"] .hitpoint-component'
            ),
            hitpointPercentile = jQuery(hitpointComponent).find(
                '.activePercentile'
            ).length
                ? Number(
                      jQuery(hitpointComponent).find('.activePercentile').text()
                  )
                : 100;
        hitpointPercentileIteration = 0;

        // Determine if

        // Timed loop: deduct x10 hitpoint percentiles for the limit defined
        var intervalID = setInterval(function () {
            if (hitpointPercentileIteration === limit) {
                // clear interval when iteration limit is reached
                clearInterval(intervalID);

                if (limit === 10) {
                    // remove hitpoint counter after deduction

                    setTimeout(function () {
                        jQuery(hitpointComponent)
                            .find('.hitpoint-percentile')
                            .empty()
                            .removeClass('activePercentile'); // remove active class and empty node
                    }, 100);
                }
            }

            var timeoutID = setTimeout(function () {
                jQuery('.activePercentile').text(hitpointPercentile);
                hitpointPercentile -= 10;
            }, 50);

            hitpointPercentileIteration++;
        }, 50);

        // HP charge down
        jQuery(hitpointComponent)
            .find('.hitpoint-meter div')
            .each(function () {
                if (hitpointPercentileIteration === limit) {
                    return;
                } // break out of loop if limit is met

                let HPmeter = jQuery(this);

                setTimeout(function () {
                    jQuery(HPmeter).removeClass('activeIndicator');
                }, iterationDelay);

                iterationDelay += 50;
            });
    }
}

// Determine caster confirmation
function determineCasterConfirmation(confirmCaster) {
    // Continue based on condition returned
    if (confirmCaster == 'true') {
        // player accepts caster

        // Construct player attributes
        constructPlayerAttributes(true, true); // player, ai

        toggleDialogueBox(false, true);

        // Construct player attributes
        constructPlayerAttributes(true, true); // player, ai

        //Remove force nerfs
        restoreForce();

        // Remove card tether reference
        jQuery('.card-aperture').removeClass('tetherCard');

        // Reset hitpoint reversal reference
        jQuery('[data-battle-field="' + playerField + '"]')
            .find('.hitpoint-percentile')
            .attr('data-revert-hitpoints', '0');

        // Remove the activeCaster class on any caster cards lower down the stacking order (essential for Levelling Phases)
        if (
            jQuery('[data-battle-field="' + playerField + '"] .in-play').find(
                '.activeCaster'
            ).length > 1
        ) {
            jQuery('[data-battle-field="' + playerField + '"] .in-play')
                .find('.activeCaster')
                .not(':last')
                .removeClass('activeCaster');
        }

        setTimeout(function () {
            // Determine progression based on field conditions
            preliminarySupportPhase();
        }, 500);
    } else if (confirmCaster == 'false') {
        // player rejects caster

        toggleDialogueBox(false, true);

        cardAperture = jQuery('.tetherCard');
        playerField = jQuery('.activeTurn')
            .closest('.field')
            .attr('data-field');
        casterSelection = jQuery(
            '[data-battle-field="' + playerField + '"] .in-play'
        )
            .find('.activeCaster')
            .last()
            .addClass('returnSelection');

        removeFromPlay(casterSelection, playerField, cardAperture);

        setTimeout(function () {
            //if(formerPhase == 'casterSelectionPhase' && jQuery('[data-battle-field="'+playerField+'"]').find('.in-play .card').length <= 0 ||
            //formerPhase == 'previewSelectionPhase' && jQuery('[data-battle-field="'+playerField+'"]').find('.in-play .card').length <= 0) {
            if (
                (formerPhase == 'casterSelectionPhase' &&
                    !attributesPlayer.hasCasterInPlay) ||
                (formerPhase == 'previewSelectionPhase' &&
                    !attributesPlayer.hasCasterInPlay)
            ) {
                casterConfirmationPhase = false; // disallow UI key navigation
                casterSelectionPhase = true; // start caster selection phase and allow UI key navigation
                formerPhase = 'casterConfirmationPhase';
                currentPhase = 'casterSelectionPhase';

                // Update phase indicator
                updatePhaseIndicator();

                // Update and display phase guide
                guideInstruction = 'Place a valid caster card in play';
                updatePhaseGuide(guideInstruction, currentPhase);

                // Unmark valid selection options
                unmarkValidSelections();

                // Mark valid selection options
                markValidSelections('caster-card-type');

                //} else if(formerPhase == 'levellingPhase' && jQuery('[data-battle-field="'+playerField+'"]').find('.in-play .card').length > 0 ||
                //formerPhase == 'previewSelectionPhase' && jQuery('[data-battle-field="'+playerField+'"]').find('.in-play .card').length > 0) {
            } else if (
                (formerPhase == 'casterSelectionPhase' &&
                    attributesPlayer.hasCasterInPlay) ||
                (formerPhase == 'previewSelectionPhase' &&
                    attributesPlayer.hasCasterInPlay)
            ) {
                casterConfirmationPhase = false; // disallow UI key navigation
                levellingPhase = true; // start levelling phase and allow UI key navigation
                formerPhase = 'casterConfirmationPhase';
                currentPhase = 'levellingPhase';

                // Update phase indicator
                updatePhaseIndicator();

                // Update and display phase guide
                guideInstruction = 'Select a valid caster card to promote to';
                updatePhaseGuide(guideInstruction, currentPhase);

                // Unmark valid selection options
                unmarkValidSelections();

                // Mark valid selection options
                promoteRankPossibility();
            }
        }, 500);
    }
}

// Move selected caster into field of play
function placeInPlay(casterSelection, playerField, cardAperture) {
    // Epheremal state handler
    jQuery(cardAperture).addClass('placingCard');

    // Retrieve co-ordinates and dimensions of in-play placeholder
    var placeholder = jQuery('[data-battle-field="' + playerField + '"]').find(
            '.in-play'
        ),
        placeholderOffset = jQuery(placeholder).offset(),
        placeholderTop = placeholderOffset.top,
        placeholderLeft = placeholderOffset.left,
        placeholderWidth = jQuery(placeholder).outerWidth(),
        placeholderHeight = jQuery(placeholder).outerHeight();

    // Retrieve co-ordinates and dimensions of card aperture
    var cardApertureOffset = jQuery(cardAperture).offset(),
        cardApertureTop = cardApertureOffset.top,
        cardApertureLeft = cardApertureOffset.left;

    // Set relative co-ordinates
    var relativeTop = placeholderTop - cardApertureTop,
        relativeLeft = placeholderLeft - cardApertureLeft;

    // Placing card
    jQuery(casterSelection).addClass('activeCard speedX2');
    jQuery(casterSelection).css({
        top: relativeTop,
        left: relativeLeft,
        width: placeholderWidth,
        height: placeholderHeight,
    }); // in motion
    jQuery(casterSelection)
        .clone()
        .appendTo(placeholder)
        .removeClass('casterSelection activeCard speedX2')
        .addClass('activeCaster ghostCard'); // clone the modified card and add to in-play placeholder

    setTimeout(function () {
        jQuery(casterSelection).remove();
        jQuery('.activeCaster').css({ top: '0', left: '0' }); // lock in position
        jQuery('.activeCaster').removeClass('ghostCard');
        jQuery(cardAperture).removeClass('placingCard');
        jQuery(cardAperture).addClass('tetherCard'); // tether card to aperture for return reference if necessary

        if (levellingPhase) {
            jQuery(cardAperture).removeClass('emphasize-promotion');
        }
    }, 200);

    // Determine charge limit
    var chargeLimit, currentHP;

    if (
        jQuery('[data-battle-field="' + playerField + '"]').find(
            '.activePercentile'
        ).length
    ) {
        // there is already an active percentile to reference...

        // Reference current HP for reversals
        currentHP = Number(
            jQuery('[data-battle-field="' + playerField + '"]')
                .find('.activePercentile')
                .text()
        );
        jQuery('[data-battle-field="' + playerField + '"]')
            .find('.hitpoint-percentile')
            .attr('data-revert-hitpoints', currentHP);

        chargeLimit = 10 - currentHP / 10;
    } else {
        // ... no active percentile to reference, define default

        // Reference current HP for reversals
        currentHP = 100;
        jQuery('[data-battle-field="' + playerField + '"]')
            .find('.hitpoint-percentile')
            .attr('data-revert-hitpoints', currentHP);

        chargeLimit = 10;
    }

    HPcharge('up', chargeLimit);
}

// Remove selected caster from field of play
function removeFromPlay(casterSelection, playerField, cardAperture) {
    var inPlayAperture = jQuery(
        '[data-battle-field="' + playerField + '"]'
    ).find('.in-play');

    // Epheremal state handler
    jQuery(inPlayAperture).addClass('placingCard');

    // Retrieve co-ordinates and dimensions of in-play placeholder
    var placeholder = jQuery('[data-battle-field="' + playerField + '"]').find(
            '.in-play'
        ),
        placeholderOffset = jQuery(placeholder).offset(),
        placeholderTop = placeholderOffset.top,
        placeholderLeft = placeholderOffset.left;

    // Retrieve co-ordinates and dimensions of card aperture
    var cardApertureOffset = jQuery(cardAperture).offset(),
        cardApertureTop = cardApertureOffset.top,
        cardApertureLeft = cardApertureOffset.left;
    (cardApertureWidth = jQuery(cardAperture).outerWidth()),
        (cardApertureHeight = jQuery(cardAperture).outerHeight());

    // Set relative co-ordinates
    var relativeTop = cardApertureTop - placeholderTop,
        relativeLeft = cardApertureLeft - placeholderLeft;

    // Placing card
    jQuery(casterSelection)
        .removeClass('activeCaster activeCard')
        .addClass('speedX2');
    jQuery(casterSelection).css({
        top: relativeTop,
        left: relativeLeft,
        width: cardApertureWidth,
        height: cardApertureHeight,
    }); // in motion
    jQuery(casterSelection)
        .clone()
        .appendTo(cardAperture)
        .removeClass('speedX2 returnSelection')
        .addClass('inactiveCaster ghostCard'); // clone the modified card and add to in-play placeholder

    setTimeout(function () {
        jQuery(casterSelection).remove();
        jQuery('.inactiveCaster').css({ top: '0', left: '0' }); // lock in position
        jQuery('.inactiveCaster').removeClass('inactiveCaster ghostCard');
        jQuery(cardAperture).removeClass('tetherCard open');
        jQuery(inPlayAperture).removeClass('placingCard');
        jQuery(cardAperture).addClass('closed valid-for-selection'); // restore former aperture classes

        if (levellingPhase) {
            jQuery(cardAperture).addClass('emphasize-promotion');
        }
    }, 200);

    // Determine charge limit
    var chargeLimit, revertToHP;

    if (
        jQuery('[data-battle-field="' + playerField + '"]').find(
            '.activePercentile'
        ).length
    ) {
        // there is already an active percentile to reference...

        revertToHP = Number(
            jQuery('[data-battle-field="' + playerField + '"]')
                .find('.activePercentile')
                .attr('data-revert-hitpoints')
        );

        chargeLimit = 10 - revertToHP / 10;

        if (chargeLimit == 0) {
            // the calculated difference as a result of a maxed HP percentile

            if (
                jQuery('[data-battle-field="' + playerField + '"]').find(
                    '.in-play .card'
                ).length > 1
            ) {
                // card/s remaining after removal, revert HP

                chargeLimit = 0;
            } else {
                // no other cards remaining after removal, reset HP

                chargeLimit = 10;
            }
        }
    }

    HPcharge('down', chargeLimit);
}

/*
 **
 ** Before Support Selection Phase
 **
 */

// Determine progression based on field conditions
function preliminarySupportPhase() {
    if (Player_Session) {
        if (!attributesPlayer.isLevelledCaster) {
            // ...caster selection or resource pooling phase has just occurred

            if (casterConfirmationPhase) {
                // Determine if valid card types are available to pool resources
                var hasCasterType = isCardInHand(
                    attributesPlayer.inHand,
                    'cardType',
                    'Caster'
                );

                if (hasCasterType) {
                    casterConfirmationPhase = false;
                    resourcePoolingPhase = true;
                    formerPhase = 'casterConfirmationPhase';
                    currentPhase = 'resourcePoolingPhase';

                    // Update phase indicator
                    updatePhaseIndicator();

                    // Update and display phase guide
                    guideInstruction =
                        'Allocate a valid caster card for resource pooling';
                    updatePhaseGuide(guideInstruction, currentPhase);

                    // Unmark valid selection options
                    unmarkValidSelections();

                    // Mark valid selection options
                    markValidSelections('caster-card-type');

                    // Display resource value tags
                    displayResourceValueTags();
                } else {
                    // TODO : invoke dialogue box to inform player, dismiss after timed delay, proceed to levelling or support selection phase
                    console.log(
                        'no available cards to allocate to resource pooling'
                    );
                }
            } else if (resourceConfirmationPhase) {
                // Verify adversaries in play
                adversaryValidation(attributesAI);
            }
        } else if (attributesPlayer.isLevelledCaster) {
            // ...levelling phase has just occurred

            // Debit resources after levelling
            resourceTransaction('levellingPhase');

            // Determine if opponent has caster in play
            adversaryValidation(attributesAI);
        }
    } else if (AI_Session) {
        if (!attributesAI.isLevelledCaster) {
            // ...caster selection or resource pooling phase has just occurred

            if (casterSelectionPhase) {
                // Determine if valid card types are available to pool resources
                var hasCasterType = isCardInHand(
                    attributesAI.inHand,
                    'cardType',
                    'Caster'
                );

                if (hasCasterType) {
                    casterSelectionPhase = false;
                    resourcePoolingPhase = true;
                    formerPhase = 'casterSelectionPhase';
                    currentPhase = 'resourcePoolingPhase';

                    // Update phase indicator
                    updatePhaseIndicator();

                    // Unmark valid selection options
                    unmarkValidSelections();

                    // Mark valid selection options
                    markValidSelections('caster-card-type');

                    // Display resource value tags
                    displayResourceValueTags();

                    // AI resource selection
                    setTimeout(function () {
                        AIresourceSelection(playerHand);
                    }, 1000);
                } else {
                    // TODO : invoke dialogue box to inform player, dismiss after timed delay, proceed to levelling or support selection phase
                    console.log(
                        'no available cards to allocate to resource pooling'
                    );
                }
            } else if (resourcePoolingPhase) {
                // Verify adversaries in play
                adversaryValidation(attributesPlayer);
            }
        } else if (attributesAI.isLevelledCaster) {
            // ...levelling phase has just occurred

            console.log('ai levellingPhase');

            // Debit resources after levelling
            resourceTransaction('levellingPhase');

            casterSelectionPhase = false;

            // Determine if player has caster in play
            adversaryValidation(attributesPlayer);
        }
    }
}

// Verify adversaries in play
function adversaryValidation(attributesObject) {
    // Determine if opponent has caster in play
    if (!attributesObject.hasCasterInPlay) {
        // TODO : notify player that opponent has no card, proceed after player confirmation

        if (battlePhaseTracker == 0) {
            // no battle phases have occurred, switch turns and proceed to draw phase

            if (Player_Session) {
                switchActiveSessions(); // switch sessions

                // Update turn
                playerTurn = false;

                // Set turn indicator
                jQuery('[data-field="ai-field"] .turn-indicator').addClass(
                    'activeTurn'
                );
                jQuery(
                    '[data-field="player-field"] .turn-indicator'
                ).removeClass('activeTurn');

                if (casterConfirmationPhase) {
                    casterConfirmationPhase = false;
                    formerPhase = 'casterConfirmationPhase';
                } else if (resourceConfirmationPhase) {
                    resourceConfirmationPhase = false;
                    formerPhase = 'resourceConfirmationPhase';
                }

                drawPhase = true; // start draw phase
                currentPhase = 'drawPhase';
            } else if (AI_Session) {
                switchActiveSessions(); // switch sessions

                // Update turn
                playerTurn = true;

                // Set turn indicator
                jQuery('[data-field="player-field"] .turn-indicator').addClass(
                    'activeTurn'
                );
                jQuery('[data-field="ai-field"] .turn-indicator').removeClass(
                    'activeTurn'
                );

                if (casterSelectionPhase) {
                    casterSelectionPhase = false;
                    formerPhase = 'casterSelectionPhase';
                } else if (resourcePoolingPhase) {
                    resourcePoolingPhase = false;
                    formerPhase = 'resourcePoolingPhase';
                }

                drawPhase = true; // start draw phase
                currentPhase = 'drawPhase';
            }

            // Update phase indicator
            updatePhaseIndicator();

            beginDrawPhase();
        } else {
            // a battle phase has occurred, switch hands, retain turns

            // switch hands based on current session
            if (Player_Session) {
                switchActiveSessions(); // switch sessions

                playerHand = jQuery('[data-field="ai-field"]');
                fieldInContext = jQuery(playerHand).attr('data-field');

                if (casterConfirmationPhase) {
                    casterConfirmationPhase = false;
                    formerPhase = 'casterConfirmationPhase';
                } else if (resourceConfirmationPhase) {
                    casterConfirmationPhase = false;
                    formerPhase = 'resourceConfirmationPhase';
                }
            } else if (AI_Session) {
                switchActiveSessions(); // switch sessions

                playerHand = jQuery('[data-field="player-field"]');
                fieldInContext = jQuery(playerHand).attr('data-field');

                if (casterSelectionPhase) {
                    casterSelectionPhase = false;
                    formerPhase = 'casterSelectionPhase';
                } else if (resourcePoolingPhase) {
                    resourcePoolingPhase = false;
                    formerPhase = 'resourcePoolingPhase';
                }
            }

            // Determine if opponent has caster in hand
            var hasCasterType = isCardInHand(
                attributesAI.inHand,
                'cardType',
                'Caster'
            );

            //if(jQuery(playerHand).find('.player-hand .caster-card-type').length > 0) { // valid caster type found
            if (hasCasterType) {
                // valid caster type found

                casterSelectionPhase = true;
                currentPhase = 'casterSelectionPhase';

                // Update phase indicator
                updatePhaseIndicator();

                if (Player_Session) {
                    // Update and display phase guide
                    guideInstruction = 'Place a valid caster card in play';
                    updatePhaseGuide(guideInstruction, currentPhase);
                }

                // Unmark valid selection options
                unmarkValidSelections();

                // Mark valid selection options
                markValidSelections('caster-card-type');

                // Nerf ranking higher than neophyte (proficient 1/2, adept 1/3, elite 1/4, peerless 1/5)
                setTimeout(function () {
                    forceNerf();
                }, 500);

                if (AI_Session) {
                    // AI caster selection
                    setTimeout(function () {
                        AIcasterSelection(playerHand);
                    }, 1000);
                }
            } else {
                // no valid caster type cards detected, draw new hand

                drawPhase = true; // start draw phase
                currentPhase = 'drawPhase';

                // Update phase indicator
                updatePhaseIndicator();

                drawCards(playerHand);
            }
        }
    } else {
        // both casters are in play, proceed to support phase

        // switch hands based on current session
        if (Player_Session) {
            switchActiveSessions(); // switch sessions

            playerHand = jQuery('[data-field="ai-field"]');
            fieldInContext = jQuery(playerHand).attr('data-field');

            if (casterConfirmationPhase) {
                casterConfirmationPhase = false;
                formerPhase = 'casterConfirmationPhase';
            } else if (resourceConfirmationPhase) {
                resourceConfirmationPhase = false;
                formerPhase = 'resourceConfirmationPhase';
            }
        } else if (AI_Session) {
            switchActiveSessions(); // switch sessions

            playerHand = jQuery('[data-field="player-field"]');
            fieldInContext = jQuery(playerHand).attr('data-field');

            if (casterSelectionPhase) {
                casterSelectionPhase = false;
                formerPhase = 'casterSelectionPhase';
            } else if (resourcePoolingPhase) {
                resourcePoolingPhase = false;
                formerPhase = 'resourcePoolingPhase';
            }
        }

        supportSelectionPhase = true;
        currentPhase = 'supportSelectionPhase';

        // Update phase indicator
        updatePhaseIndicator();

        if (Player_Session) {
            // Update and display phase guide
            guideInstruction = 'Select a valid support card to place in play';
            updatePhaseGuide(guideInstruction, currentPhase);
        } else if (AI_Session) {
            // Dismiss current phase guide
            dismissPhaseGuide();
        }

        // Unmark valid selection options
        unmarkValidSelections();

        // Mark valid selection options
        markValidSelections('support-card-type');

        // Prepare support card aperture
        enableSupportAperture();

        if (AI_Session) {
            // AI support selection
            setTimeout(function () {
                AIsupportSelection(playerHand);
            }, 1000);
        }
    }
}

/*
 **
 ** Resource Pool Phase
 **
 */
var resourceMotiv,
    resourceCurrency,
    resourceCurrentCount,
    resourceUpdatedCount,
    resourceTagReference;

// Select with keys
function keySelectResource() {
    if (resourcePoolingPhase) {
        cardAperture = jQuery('.valid-for-selection.focus');
        jQuery(cardAperture).find('.card').addClass('resourceSelection');

        resourceSelection = jQuery('.resourceSelection');
        playerField = jQuery('.activeTurn')
            .closest('.field')
            .attr('data-field');

        confirmResourceSelection(resourceSelection, playerField, cardAperture);
    }
}

// Prompt player to confirm selection
function confirmResourceSelection(
    resourceSelection,
    playerField,
    cardAperture
) {
    // Move to resource pool
    placeInPool(resourceSelection, playerField, cardAperture);
    jQuery(cardAperture)
        .removeClass('focus closed valid-for-selection')
        .addClass('open');

    dialogueBoxContent = `<div class="confirmation-prompt">
                            Confirm Selection
                            <div class="confirm-options">
                                <div class="btn btn-confirm focus" data-confirm="true">Confirm</div>
                                <div class="btn btn-confirm" data-confirm="false">Reject</div>
                            </div>
                        </div>`;

    if (jQuery('.dialogueBox .dialogueBox-body').children().length === 0) {
        // prevent additional prepending by excessive user input
        jQuery('.dialogueBox .dialogueBox-body').prepend(dialogueBoxContent);
    }

    // call dialogue box
    toggleDialogueBox(false, true);

    if (previewSelectionPhase) {
        previewSelectionPhase = false; // disallow UI key navigation
        formerPhase = 'previewSelectionPhase';
    } else if (resourcePoolingPhase) {
        resourcePoolingPhase = false; // disallow UI key navigation
        formerPhase = 'resourcePoolingPhase';
    }
    resourceConfirmationPhase = true; // allow key selection
    currentPhase = 'resourceConfirmationPhase';

    // Update phase indicator
    updatePhaseIndicator();
}

// Determine resource confirmation
function determineResourceConfirmation(confirmResource) {
    // Continue based on condition returned
    if (confirmResource == 'true') {
        // player confirms resource

        // Construct player attributes
        constructPlayerAttributes(true, true); // player, ai

        toggleDialogueBox(false, true);

        jQuery('.card-aperture').removeClass('tetherCard'); // remove card tether reference
        jQuery('.resource').removeClass('poolingResource'); // remove resource pool reference
        jQuery('.resource-aperture').removeClass('activeResource'); // remove aperture reference

        // Remove resource value tags
        removeResourceValueTags();

        // Unmark valid selection options
        unmarkValidSelections();

        // Determine if ranking is possible
        if (supportLevellingPossibility()) {
            // check for support leveling cards

            // Allow enough time for previouse dialogue box to dismiss
            setTimeout(function () {
                dialogueBoxContent = `<div class="confirmation-prompt">
                                    <div class="dialogue-box-notice-emphasis">Leverage Levelling Support?</div>
                                    <div class="dialogue-box-notice-detail">
                                        Would you like to use the levelling support card detected in your hand?
                                    </div>
                                    <div class="confirm-options">
                                        <div class="btn btn-confirm focus" data-confirm="true">Yes</div>
                                        <div class="btn btn-confirm" data-confirm="false">No</div>
                                    </div>
                                </div>`;

                if (
                    jQuery('.dialogueBox .dialogueBox-body').children()
                        .length === 0
                ) {
                    // prevent additional prepending by excessive user input
                    jQuery('.dialogueBox .dialogueBox-body').prepend(
                        dialogueBoxContent
                    );
                }

                // call dialogue box
                toggleDialogueBox(false, true);
            }, 500);

            // Dismiss the current phase guide
            dismissPhaseGuide();

            resourceConfirmationPhase = false; // disallow UI key navigation
            proceedConfirmationPhase = true; // allow key selection
            currentPhase = 'proceedConfirmationPhase';
            formerPhase = 'resourceConfirmationPhase';

            // Update phase indicator
            updatePhaseIndicator();
        } else if (promoteRankPossibility()) {
            // check for standard levelling requirements

            //Remove force nerfs
            restoreForce();

            resourceConfirmationPhase = false; // disallow UI key navigation
            levellingPhase = true; // start resource pooling phase and allow UI key navigation
            currentPhase = 'levellingPhase';
            formerPhase = 'resourceConfirmationPhase';

            // Update phase indicator
            updatePhaseIndicator();

            // Update and display phase guide
            guideInstruction = 'Select a valid caster card to promote to';
            updatePhaseGuide(guideInstruction, currentPhase);
        } else {
            // rank promotion not possible, determine next phase

            setTimeout(function () {
                // Determine progression based on field conditions
                preliminarySupportPhase();
            }, 500);
        }
    } else if (confirmResource == 'false') {
        // player rescinds resource

        toggleDialogueBox(false, true);

        cardAperture = jQuery('.tetherCard');
        playerField = jQuery('.activeTurn')
            .closest('.field')
            .attr('data-field');
        resourceSelection = jQuery(
            '[data-resource-field="' + playerField + '"] .resource'
        ).find('.activeResource');

        removeFromPool(resourceSelection, playerField, cardAperture);

        resourceConfirmationPhase = false; // disallow UI key navigation
        resourcePoolingPhase = true; // start resource pooling phase and allow UI key navigation
        formerPhase = 'resourceConfirmationPhase';
        currentPhase = 'resourcePoolingPhase';

        // Update phase indicator
        updatePhaseIndicator();

        // Update and display phase guide
        guideInstruction = 'Allocate a valid caster card for resource pooling';
        updatePhaseGuide(guideInstruction, currentPhase);

        // Unmark valid selection options
        unmarkValidSelections();

        // Mark valid selection options
        markValidSelections('caster-card-type');
    }
}

// Move selected resource into applicable pool
function placeInPool(resourceSelection, playerField, cardAperture) {
    // Epheremal state handler
    jQuery(cardAperture).addClass('placingCard');

    if (jQuery(resourceSelection).find('.cardFront').hasClass('terra-motiv')) {
        resourceMotiv = '.resource-terra .resource-aperture';
    } else if (
        jQuery(resourceSelection).find('.cardFront').hasClass('aero-motiv')
    ) {
        resourceMotiv = '.resource-aero .resource-aperture';
    } else if (
        jQuery(resourceSelection).find('.cardFront').hasClass('hydro-motiv')
    ) {
        resourceMotiv = '.resource-hydro .resource-aperture';
    } else if (
        jQuery(resourceSelection).find('.cardFront').hasClass('pyro-motiv')
    ) {
        resourceMotiv = '.resource-pyro .resource-aperture';
    }

    jQuery(resourceMotiv).parent('.resource').addClass('poolingResource');

    // Retrieve co-ordinates and dimensions of resource placeholder
    var placeholder = jQuery(
            '[data-resource-field="' + playerField + '"]'
        ).find(resourceMotiv),
        placeholderOffset = jQuery(placeholder).offset(),
        placeholderTop = placeholderOffset.top,
        placeholderLeft = placeholderOffset.left,
        placeholderWidth = jQuery(placeholder).outerWidth(),
        placeholderHeight = jQuery(placeholder).outerHeight();

    // Retrieve co-ordinates and dimensions of card aperture
    var cardApertureOffset = jQuery(cardAperture).offset(),
        cardApertureTop = cardApertureOffset.top,
        cardApertureLeft = cardApertureOffset.left;

    // Set relative co-ordinates
    var relativeTop = placeholderTop - cardApertureTop,
        relativeLeft = placeholderLeft - cardApertureLeft;

    // Placing card
    jQuery(resourceSelection).addClass('activeCard activeResource speedX2');
    jQuery(resourceSelection).css({
        top: relativeTop,
        left: relativeLeft,
        width: placeholderHeight,
        height: placeholderWidth,
    }); // in motion
    jQuery(resourceSelection)
        .clone()
        .appendTo(placeholder)
        .removeClass('resourceSelection activeCard speedX2')
        .addClass('activeResource ghostCard'); // clone the modified card and add to in-play placeholder

    // Generify elemental motif
    jQuery('.activeResource')
        .find('.card-elemental-motif .fas')
        .addClass('fa-circle'); // overwrite specific motiv

    // Remove resource tag
    resourceTagReference = jQuery(resourceSelection).attr('data-iteration');
    jQuery(
        '.display-resource-value[data-tag-iteration="' +
            resourceTagReference +
            '"]'
    ).removeClass('activeResourceTag');

    // Calculate resource pool wealth
    resourceCurrentCount = Number(
        jQuery(placeholder)
            .parent('.resource')
            .find('.resource-counter')
            .attr('data-pool-wealth')
    );
    resourceCurrency = Number(
        jQuery(resourceSelection).attr('data-resource-currency')
    );
    resourceUpdatedCount = resourceCurrentCount += resourceCurrency;

    setTimeout(function () {
        jQuery(resourceSelection).remove();
        jQuery('.activeResource').css({ top: '0', left: '0' }); // lock in position
        jQuery('.activeResource').removeClass('ghostCard');
        jQuery(cardAperture).removeClass('placingCard');
        jQuery(cardAperture).addClass('tetherCard'); // tether card to aperture for return reference if necessary

        // Update resource pool wealth
        jQuery(placeholder)
            .parent('.resource')
            .find('.resource-counter')
            .text(resourceUpdatedCount);
        jQuery(placeholder)
            .parent('.resource')
            .find('.resource-counter')
            .attr('data-pool-wealth', resourceUpdatedCount);

        // Display added resource value
        jQuery(placeholder)
            .parent('.resource')
            .find('.resource-added-value')
            .text(resourceCurrency)
            .toggleClass('activeAddedValue');
        setTimeout(function () {
            jQuery(placeholder)
                .parent('.resource')
                .find('.resource-added-value')
                .empty()
                .toggleClass('activeAddedValue');
        }, 1000);

        // Indicate active pool
        if (!jQuery(placeholder).parent('.resource').hasClass('activePool')) {
            jQuery(placeholder).parent('.resource').addClass('activePool');
        }
    }, 200);
}

// Remove selected resource from pool
function removeFromPool(resourceSelection, playerField, cardAperture) {
    var resourceAperture = jQuery(
        '[data-resource-field="' + playerField + '"]'
    ).find('.poolingResource .resource-aperture');

    // Epheremal state handler
    jQuery(resourceAperture).addClass('placingCard');

    // Retrieve co-ordinates and dimensions of resource placeholder
    var placeholder = jQuery(
            '[data-resource-field="' + playerField + '"]'
        ).find(resourceAperture),
        placeholderOffset = jQuery(placeholder).offset(),
        placeholderTop = placeholderOffset.top,
        placeholderLeft = placeholderOffset.left;

    // Retrieve co-ordinates and dimensions of card aperture
    var cardApertureOffset = jQuery(cardAperture).offset(),
        cardApertureTop = cardApertureOffset.top,
        cardApertureLeft = cardApertureOffset.left,
        cardApertureWidth = jQuery(cardAperture).outerWidth(),
        cardApertureHeight = jQuery(cardAperture).outerHeight();

    // Set relative co-ordinates
    var relativeTop = cardApertureTop - placeholderTop,
        relativeLeft = cardApertureLeft - placeholderLeft;

    // Specify elemental motif
    jQuery('.activeResource')
        .find('.card-elemental-motif .fas')
        .removeClass('fa-circle'); // fallback to specific motiv

    // Placing card
    jQuery(resourceSelection)
        .removeClass('activeResource activeCard')
        .addClass('inactiveResource speedX2');
    jQuery(resourceSelection).css({
        top: relativeTop,
        left: relativeLeft,
        width: cardApertureWidth,
        height: cardApertureHeight,
    }); // in motion
    jQuery(resourceSelection)
        .clone()
        .appendTo(cardAperture)
        .removeClass('speedX2')
        .addClass('ghostCard'); // clone the modified card and add to in-play placeholder

    // Reset resource pool wealth
    resourceUpdatedCount = resourceCurrentCount -= resourceCurrency;

    setTimeout(function () {
        jQuery(resourceSelection).remove();
        jQuery('.inactiveResource').css({ top: '0', left: '0' }); // lock in position
        jQuery('.inactiveResource').removeClass('inactiveResource ghostCard');
        jQuery(cardAperture).removeClass('tetherCard open');
        jQuery(cardAperture).addClass('closed valid-for-selection'); // restore former aperture classes
        jQuery(resourceAperture).removeClass('placingCard poolingResource');

        // Restore resource tag
        resourceTagReference = jQuery(resourceSelection).attr('data-iteration');
        jQuery(
            '.display-resource-value[data-tag-iteration="' +
                resourceTagReference +
                '"]'
        ).addClass('activeResourceTag');

        // Reset resource pool wealth
        jQuery(resourceAperture)
            .parent('.resource')
            .find('.resource-counter')
            .text(resourceUpdatedCount);
        jQuery(resourceAperture)
            .parent('.resource')
            .find('.resource-counter')
            .attr('data-pool-wealth', resourceUpdatedCount);

        // Indicate inactive pool
        if (
            jQuery(resourceAperture)
                .parent('.resource')
                .hasClass('activePool') &&
            jQuery(resourceAperture).children().length <= 0
        ) {
            jQuery(resourceAperture)
                .parent('.resource')
                .removeClass('activePool');
        }
    }, 200);
}

// Display resource value tags
function displayResourceValueTags() {
    var resourceValue,
        resourceDiscipline,
        resourceDisciplineTag,
        resourceTagIteration,
        resourceValueTag = '<div class="display-resource-value"></div>';

    jQuery(
        '[data-field="' + playerField + '"] .player-hand .valid-for-selection'
    ).each(function (i) {
        // Retrieve co-ordinates of card aperture
        var cardApertureOffset = jQuery(this).offset(),
            cardApertureWidth = jQuery(cardAperture).outerWidth() - 5,
            cardApertureTop = cardApertureOffset.top - 5,
            cardApertureLeft = cardApertureOffset.left + cardApertureWidth;

        resourceValue = jQuery(this)
            .find('.card-resource-currency')
            .children().length;
        resourceDiscipline = jQuery(this).find('.card-discipline').text();
        resourceTagIteration = jQuery(this)
            .find('.card')
            .attr('data-iteration');

        switch (resourceDiscipline) {
            case 'aero':
                resourceDisciplineTag = 'aero-tag';
                break;
            case 'terra':
                resourceDisciplineTag = 'terra-tag';
                break;
            case 'hydro':
                resourceDisciplineTag = 'hydro-tag';
                break;
            case 'pyro':
                resourceDisciplineTag = 'pyro-tag';
                break;
        }

        jQuery('[data-field="' + playerField + '"]').append(
            jQuery(resourceValueTag)
                .text(resourceValue)
                .css({ left: cardApertureLeft, top: cardApertureTop })
                .addClass(resourceDisciplineTag)
                .attr('data-tag-iteration', resourceTagIteration)
        );
    });

    jQuery('.display-resource-value').addClass('activeResourceTag');
}

// Adjust tag positionings on window resize
jQuery(window).on('resize', function () {
    jQuery('.display-resource-value').each(function () {
        resourceTagReference = jQuery(this).attr('data-tag-iteration');

        // Retrieve co-ordinates of card aperture
        var cardApertureReference = jQuery(
            '.card[data-iteration="' + resourceTagReference + '"]'
        ).parent('.valid-for-selection');
        (cardApertureOffset = jQuery(cardApertureReference).offset()),
            (cardApertureWidth = jQuery(cardAperture).outerWidth() - 5),
            (cardApertureTop = cardApertureOffset.top - 5),
            (cardApertureLeft = cardApertureOffset.left + cardApertureWidth);

        jQuery(this).css({ left: cardApertureLeft, top: cardApertureTop });
    });
});

// Remove resource value tags
function removeResourceValueTags() {
    jQuery('.display-resource-value').removeClass('activeResourceTag');

    setTimeout(function () {
        jQuery('.display-resource-value').remove();
    }, 500);
}

/*
 **
 ** Levelling Phase
 **
 */
var rankPromotion = false;

// Expedite levelling phase with support card
// Return: Boolean
function supportLevellingPossibility() {
    // Determine if levelling support card is available to play
    if (jQuery(playerHand).find('.player-hand .levelling-card-type').length) {
        return true;
    } else {
        return false;
    }
}

// Determine rank promotion possibility
// Return: Boolean
function promoteRankPossibility() {
    var checkCaster,
        casterRank,
        casterDiscipline,
        levellingCost,
        resourcePoolValue,
        nextTier;

    playerField = jQuery('.activeTurn').closest('.field').attr('data-field');

    checkCaster = jQuery(
        '[data-battle-field="' + playerField + '"] .in-play'
    ).find('.cardFront');

    // Determine rank of card in play
    if (jQuery(checkCaster).hasClass('neophyte-ranking')) {
        casterRank = 'neophyte';
    } else if (jQuery(checkCaster).hasClass('proficient-ranking')) {
        casterRank = 'proficient';
    } else if (jQuery(checkCaster).hasClass('adept-ranking')) {
        casterRank = 'adept';
    } else if (jQuery(checkCaster).hasClass('elite-ranking')) {
        casterRank = 'elite';
    }

    // Determine discipline of card in play
    if (jQuery(checkCaster).hasClass('terra-motiv')) {
        casterDiscipline = 'terra-motiv';
    } else if (jQuery(checkCaster).hasClass('aero-motiv')) {
        casterDiscipline = 'aero-motiv';
    } else if (jQuery(checkCaster).hasClass('hydro-motiv')) {
        casterDiscipline = 'hydro-motiv';
    } else if (jQuery(checkCaster).hasClass('pyro-motiv')) {
        casterDiscipline = 'pyro-motiv';
    }

    // Determine if valid higher tier is present and is of identical discipline
    switch (casterRank) {
        case 'neophyte':
            nextTier = '.proficient-ranking';

            if (
                jQuery('[data-field="' + playerField + '"] .player-hand').find(
                    nextTier
                ).length && // determine if a valid higher tier is present
                jQuery('[data-field="' + playerField + '"] .player-hand')
                    .find(nextTier)
                    .hasClass(casterDiscipline)
            ) {
                // determine if same discipline is shared

                // Determine if rank promotion is affordable
                rankCostAffordability(nextTier, casterDiscipline);
                if (rankPromotion) {
                    return true;
                } else {
                    return false;
                }
            }

            break;

        case 'proficient':
            nextTier = '.adept-ranking';

            if (
                jQuery('[data-field="' + playerField + '"] .player-hand').find(
                    nextTier
                ).length && // determine if a valid higher tier is present
                jQuery('[data-field="' + playerField + '"] .player-hand')
                    .find(nextTier)
                    .hasClass(casterDiscipline)
            ) {
                // determine if same discipline is shared

                // Determine if rank promotion is affordable
                rankCostAffordability(nextTier, casterDiscipline);
                if (rankPromotion) {
                    return true;
                } else {
                    return false;
                }
            }

            break;

        case 'adept':
            nextTier = '.elite-ranking';

            if (
                jQuery('[data-field="' + playerField + '"] .player-hand').find(
                    nextTier
                ).length && // determine if a valid higher tier is present
                jQuery('[data-field="' + playerField + '"] .player-hand')
                    .find(nextTier)
                    .hasClass(casterDiscipline)
            ) {
                // determine if same discipline is shared

                // Determine if rank promotion is affordable
                rankCostAffordability(nextTier, casterDiscipline);
                if (rankPromotion) {
                    return true;
                } else {
                    return false;
                }
            }

            break;

        case 'elite':
            nextTier = '.peerless-ranking';

            if (
                jQuery('[data-field="' + playerField + '"] .player-hand').find(
                    nextTier
                ).length && // determine if a valid higher tier is present
                jQuery('[data-field="' + playerField + '"] .player-hand')
                    .find(nextTier)
                    .hasClass(casterDiscipline)
            ) {
                // determine if same discipline is shared

                // Determine if rank promotion is affordable
                rankCostAffordability(nextTier, casterDiscipline);
                if (rankPromotion) {
                    return true;
                } else {
                    return false;
                }
            }

            break;
    }

    // Determine if rank promotion is affordable
    function rankCostAffordability(nextTier, rankingDiscipline) {
        var resourceDiscipline;

        switch (rankingDiscipline) {
            case 'terra-motiv':
                resourceDiscipline = '.resource-terra';
                break;
            case 'aero-motiv':
                resourceDiscipline = '.resource-aero';
                break;
            case 'hydro-motiv':
                resourceDiscipline = '.resource-hydro';
                break;
            case 'pyro-motiv':
                resourceDiscipline = '.resource-pyro';
                break;
        }

        // Iterate through all possible options
        jQuery('[data-field="' + playerField + '"] .player-hand')
            .find(nextTier)
            .each(function () {
                if (jQuery(this).hasClass(rankingDiscipline)) {
                    // Retrieve valid higher tier levelling cost
                    levellingCost = Number(
                        jQuery(this)
                            .find('.levelling-cost')
                            .attr('data-levelling-cost')
                    );

                    // Retrieve resource pool value
                    resourcePoolValue = Number(
                        jQuery(
                            '[data-resource-field="' +
                                playerField +
                                '"] ' +
                                resourceDiscipline +
                                ' .resource-counter'
                        ).attr('data-pool-wealth')
                    );

                    // Determine if resource pool value is greater than levelling cost
                    if (resourcePoolValue >= levellingCost) {
                        // Mark valid selection options
                        jQuery(this)
                            .closest('.card-aperture')
                            .addClass(
                                'valid-for-selection emphasize-selection emphasize-promotion'
                            );

                        // Possible to promote rank
                        rankPromotion = true;
                    }
                }
            });

        setTimeout(function () {
            jQuery('.valid-for-selection').removeClass('emphasize-selection');
        }, 300);
    }
}

/*
 **
 ** Support Phase
 **
 */

// Prepare support card aperture
function enableSupportAperture() {
    if (Player_Session) {
        playerField = 'player-field';
    } else if (AI_Session) {
        playerField = 'ai-field';
    }

    jQuery('[data-battle-field="' + playerField + '"]')
        .find('.support-card-component')
        .addClass('activeSupportAperture');
}

// Select with keys
function keySelectSupport() {
    if (
        formerPhase == 'supportSelectionPhase' ||
        formerPhase == 'supportLevellingPhase'
    ) {
        cardAperture = jQuery('.valid-for-selection.focus');
        jQuery(cardAperture).find('.card').addClass('supportSelection');

        supportSelection = jQuery('.supportSelection');
        playerField = jQuery('.activeTurn')
            .closest('.field')
            .attr('data-field');

        confirmSupportSelection(supportSelection, playerField, cardAperture);
    }
}

// Prompt player to confirm selection
function confirmSupportSelection(supportSelection, playerField, cardAperture) {
    // Move to resource pool
    placeInSupport(supportSelection, playerField, cardAperture);
    jQuery(cardAperture)
        .removeClass('focus closed valid-for-selection')
        .addClass('open');

    dialogueBoxContent = `<div class="confirmation-prompt">
                            Confirm Selection
                            <div class="confirm-options">
                                <div class="btn btn-confirm focus" data-confirm="true">Confirm</div>
                                <div class="btn btn-confirm" data-confirm="false">Reject</div>
                            </div>
                        </div>`;

    if (jQuery('.dialogueBox .dialogueBox-body').children().length === 0) {
        // prevent additional prepending by excessive user input
        jQuery('.dialogueBox .dialogueBox-body').prepend(dialogueBoxContent);
    }

    // call dialogue box
    toggleDialogueBox(false, true);

    if (previewSelectionPhase) {
        previewSelectionPhase = false; // disallow UI key navigation
        formerPhase = 'previewSelectionPhase';
    } else if (supportSelectionPhase) {
        supportSelectionPhase = false; // disallow UI key navigation
        formerPhase = 'supportSelectionPhase';
    } else if (supportLevellingPhase) {
        supportLevellingPhase = false; // disallow UI key navigation
        formerPhase = 'supportLevellingPhase';
    }
    supportConfirmationPhase = true; // allow key selection
    currentPhase = 'supportConfirmationPhase';

    // Update phase indicator
    updatePhaseIndicator();
}

// Determine support confirmation
function determineSupportConfirmation(confirmSupport) {
    // Continue based on condition returned
    if (confirmSupport == 'true') {
        // player confirms support

        // Construct player attributes
        constructPlayerAttributes(true, true); // player, ai

        toggleDialogueBox(false, true);

        // Remove card tether reference
        jQuery('.card-aperture').removeClass('tetherCard');

        supportConfirmationPhase = false; // disallow UI key navigation

        // Unmark valid selection options
        unmarkValidSelections();

        if (formerPhase == 'supportLevellingPhase') {
            // Reference and find the applicable support effect to invoke
            findSupportEffect();
        } else if (formerPhase == 'supportSelectionPhase') {
            // TODO : delay invokation of support effect until both support cards have been placed in play
        }

        // TODO : invoke support card effect, determine if support card is effective
        // Levelling: discard support card immediately after use (failure or success) if levelling support
        // Battle: discard support card after battle phase is over and hitpoint recalculations have resolved
    } else if (confirmSupport == 'false') {
        // player rescinds support

        toggleDialogueBox(false, true);

        if (Player_Session) {
            playerField = 'player-field';
        } else if (AI_Session) {
            playerField = 'ai-field';
        }

        cardAperture = jQuery('.tetherCard');
        supportSelection = jQuery(
            '[data-battle-field="' + playerField + '"] .activeSupportAperture'
        ).find('.activeSupport');

        // Determine correct support phase to revert to
        var supportTypeCheck;

        if (
            jQuery('.activeSupport')
                .find('.cardFront')
                .hasClass('levelling-card-type')
        ) {
            supportTypeCheck = 'levelling-card-type';
        } else if (
            jQuery('.activeSupport')
                .find('.cardFront')
                .hasClass('levelling-card-type')
        ) {
            supportTypeCheck = 'support-card-type';
        }

        removeFromSupport(supportSelection, playerField, cardAperture);

        supportConfirmationPhase = false; // disallow UI key navigation

        if (supportTypeCheck == 'levelling-card-type') {
            supportLevellingPhase = true; // start resource pooling phase and allow UI key navigation
            formerPhase = 'supportConfirmationPhase';
            currentPhase = 'supportLevellingPhase';

            // Update phase indicator
            updatePhaseIndicator();

            // Update and display phase guide
            guideInstruction =
                'Select a valid support levelling card to place in play';
            updatePhaseGuide(guideInstruction, currentPhase);

            // Unmark valid selection options
            unmarkValidSelections();

            // Mark valid selection options
            markValidSelections('levelling-card-type');
        } else if (supportTypeCheck == 'support-card-type') {
            levellingPhase = true; // start resource pooling phase and allow UI key navigation
            formerPhase = 'supportConfirmationPhase';
            currentPhase = 'supportSelectionPhase';

            // Update phase indicator
            updatePhaseIndicator();

            // Update and display phase guide
            guideInstruction = 'Select a valid support card to place in play';
            updatePhaseGuide(guideInstruction, currentPhase);

            // Unmark valid selection options
            unmarkValidSelections();

            // Mark valid selection options
            markValidSelections('support-card-type');
        }
    }
}

// Move selected support into aperture
function placeInSupport(supportSelection, playerField, cardAperture) {
    // Epheremal state handler
    jQuery(cardAperture).addClass('placingCard');

    // Retrieve co-ordinates and dimensions of support placeholder
    var placeholder = jQuery('.activeSupportAperture'),
        placeholderOffset = jQuery(placeholder).offset(),
        placeholderTop = placeholderOffset.top,
        placeholderLeft = placeholderOffset.left,
        placeholderWidth = jQuery(placeholder).outerWidth(),
        placeholderHeight = jQuery(placeholder).outerHeight();

    // Retrieve co-ordinates and dimensions of card aperture
    var cardApertureOffset = jQuery(cardAperture).offset(),
        cardApertureTop = cardApertureOffset.top,
        cardApertureLeft = cardApertureOffset.left;

    // Set relative co-ordinates
    var relativeTop = placeholderTop - cardApertureTop,
        relativeLeft = placeholderLeft - cardApertureLeft;

    // Placing card
    jQuery(supportSelection).addClass('activeCard speedX2');
    jQuery(supportSelection).css({
        top: relativeTop,
        left: relativeLeft,
        width: placeholderWidth,
        height: placeholderHeight,
    }); // in motion
    jQuery(supportSelection)
        .clone()
        .appendTo(placeholder)
        .removeClass('supportSelection activeCard speedX2')
        .addClass('activeSupport ghostCard'); // clone the modified card and add to in-play placeholder

    setTimeout(function () {
        jQuery(supportSelection).remove();
        jQuery('.activeSupport').css({ top: '0', left: '0' }); // lock in position
        jQuery('.activeSupport').removeClass('ghostCard');
        jQuery(cardAperture).removeClass('placingCard');
        jQuery(cardAperture).addClass('tetherCard'); // tether card to aperture for return reference if necessary
    }, 200);
}

// Remove selected support from aperture
function removeFromSupport(supportSelection, playerField, cardAperture) {
    var supportAperture = jQuery(
        '[data-battle-field="' + playerField + '"]'
    ).find('.activeSupportAperture');

    // Epheremal state handler
    jQuery(supportAperture).addClass('placingCard');

    // Retrieve co-ordinates and dimensions of support placeholder
    var placeholder = jQuery('[data-battle-field="' + playerField + '"]').find(
            supportAperture
        ),
        placeholderOffset = jQuery(placeholder).offset(),
        placeholderTop = placeholderOffset.top,
        placeholderLeft = placeholderOffset.left;

    // Retrieve co-ordinates and dimensions of card aperture
    var cardApertureOffset = jQuery(cardAperture).offset(),
        cardApertureTop = cardApertureOffset.top,
        cardApertureLeft = cardApertureOffset.left,
        cardApertureWidth = jQuery(cardAperture).outerWidth(),
        cardApertureHeight = jQuery(cardAperture).outerHeight();

    // Set relative co-ordinates
    var relativeTop = cardApertureTop - placeholderTop,
        relativeLeft = cardApertureLeft - placeholderLeft;

    // Placing card
    jQuery(supportSelection)
        .removeClass('activeSupport activeCard')
        .addClass('speedX2');
    jQuery(supportSelection).css({
        top: relativeTop,
        left: relativeLeft,
        width: cardApertureWidth,
        height: cardApertureHeight,
    }); // in motion
    jQuery(supportSelection)
        .clone()
        .appendTo(cardAperture)
        .removeClass('speedX2')
        .addClass('inactiveSupport ghostCard'); // clone the modified card and add to in-play placeholder

    setTimeout(function () {
        jQuery(supportSelection).remove();
        jQuery('.inactiveSupport').css({ top: '0', left: '0' }); // lock in position
        jQuery('.inactiveSupport').removeClass('inactiveSupport ghostCard');
        jQuery(cardAperture).removeClass('tetherCard open');
        jQuery(supportAperture).removeClass('placingCard');
        jQuery(cardAperture).addClass('closed valid-for-selection'); // restore former aperture classes
    }, 200);
}

// Search & Invoke the support effect
function findSupportEffect() {
    playerField = jQuery('.activeTurn').closest('.field').attr('data-field');

    var supportCard = jQuery(
            '[data-battle-field="' + playerField + '"] .activeSupportAperture'
        ).find('.card'),
        supportID = Number(
            jQuery(supportCard).find('.support-attributes').attr('data-id')
        );

    // Lookup support ID and invoke associative effect
    invokeSupportEffect(supportID);
}

/*
 **
 ** Resource transactions
 **
 */
var cardCost, // cost of support or levelling action
    cardCurrency, // card resource currency determined by discipline type
    cardResource, // card resource value
    cardResourceAdjusted, // adjusted resource of the card, used to determine remaining resource after deductions
    resourcePoolTotal, // total pool wealth
    resourcePoolAdjusted, // adjusted resource pool total
    resourcePoolArray, // array of all pool totals, used when no specific currency is required
    resourcePoolMax, // maximum total extracted from resource pool array, used to find the resource pool with the highest balance to debit from
    resourceAdjustmentIteration = 0; // iteration counter for visual adjustments to pool totals

// Calculate and debit resource transactions for support and levelling costs
function resourceTransaction(phase) {
    if (Player_Session) {
        playerField = 'player-field';
    } else if (AI_Session) {
        playerField = 'ai-field';
    }

    console.log('playerField:', playerField);

    if (phase == 'levellingPhase') {
        // Determine cardCurrency by discipline type of caster card
        if (
            jQuery('[data-battle-field="' + playerField + '"]')
                .find('.in-play .cardFront')
                .hasClass('aero-motiv')
        ) {
            cardCurrency = '.resource-aero';
        } else if (
            jQuery('[data-battle-field="' + playerField + '"]')
                .find('.in-play .cardFront')
                .hasClass('terra-motiv')
        ) {
            cardCurrency = '.resource-terra';
        } else if (
            jQuery('[data-battle-field="' + playerField + '"]')
                .find('.in-play .cardFront')
                .hasClass('hydro-motiv')
        ) {
            cardCurrency = '.resource-hydro';
        } else if (
            jQuery('[data-battle-field="' + playerField + '"]')
                .find('.in-play .cardFront')
                .hasClass('pyro-motiv')
        ) {
            cardCurrency = '.resource-pyro';
        }

        cardCost = Number(
            jQuery('[data-battle-field="' + playerField + '"]')
                .find('.in-play .card .levelling-cost')
                .attr('data-levelling-cost')
        );

        console.log('cardCost:', cardCost);
    } else if (
        phase == 'supportLevellingPhase' ||
        phase == 'supportSelectionPhase'
    ) {
        // Determine cardCurrency by discipline type of support card if applicable
        if (
            jQuery('[data-battle-field="' + playerField + '"]')
                .find('.support-card-component .cardFront')
                .hasClass('aero-motiv')
        ) {
            cardCurrency = '.resource-aero';
        } else if (
            jQuery('[data-battle-field="' + playerField + '"]')
                .find('.support-card-component .cardFront')
                .hasClass('terra-motiv')
        ) {
            cardCurrency = '.resource-terra';
        } else if (
            jQuery('[data-battle-field="' + playerField + '"]')
                .find('.support-card-component .cardFront')
                .hasClass('hydro-motiv')
        ) {
            cardCurrency = '.resource-hydro';
        } else if (
            jQuery('[data-battle-field="' + playerField + '"]')
                .find('.support-card-component .cardFront')
                .hasClass('pyro-motiv')
        ) {
            cardCurrency = '.resource-pyro';
        } else {
            cardCurrency = false;
        }

        cardCost = Number(
            jQuery('[data-battle-field="' + playerField + '"]')
                .find('.support-card-component .card .resource-cost')
                .attr('data-resource-cost')
        );
    }

    if (cardCurrency != false) {
        resourcePoolTotal = Number(
            jQuery(
                '[data-resource-field="' + playerField + '"] ' + cardCurrency
            )
                .find('.resource-counter')
                .attr('data-pool-wealth')
        );

        resourcePoolAdjusted = resourcePoolTotal - cardCost;

        // Update resource reserves
        jQuery('[data-resource-field="' + playerField + '"] ' + cardCurrency)
            .find('.resource-counter')
            .attr('data-pool-wealth', resourcePoolAdjusted);

        // Visually adjust the resource counter
        // Timed loop: deduct x1 resource point for the limit defined
        var intervalID = setInterval(function () {
            if (resourceAdjustmentIteration === cardCost) {
                // clear interval when iteration limit is reached

                console.log(
                    'cardCost: ' + cardCost,
                    'iterations adjustment: ' + resourceAdjustmentIteration
                );

                clearInterval(intervalID);

                // Manage active resource pools
                setTimeout(function () {
                    manageResourcePools(
                        cardCurrency,
                        cardCost,
                        resourcePoolTotal
                    );
                }, 100);
            }

            var timeoutID = setTimeout(function () {
                jQuery(
                    '[data-resource-field="' +
                        playerField +
                        '"] ' +
                        cardCurrency
                )
                    .find('.resource-counter')
                    .text(resourcePoolTotal);
                resourcePoolTotal -= 1;

                console.log('resourcePoolTotal:', resourcePoolTotal);
            }, 100);

            resourceAdjustmentIteration++;
        }, 100);
    } else {
        // cardCurrency is false, find the resource pool with the largest sum of wealth for debit

        console.log('cardCurrency ' + cardCurrency);

        deductFromHighestResource();

        // Visually adjust the resource counter
        // Timed loop: deduct x1 resource point for the limit defined
        var intervalID = setInterval(function () {
            if (
                resourceAdjustmentIteration === cardCost ||
                resourceAdjustmentIteration === resourcePoolTotal
            ) {
                // clear interval when iteration limit is reached

                clearInterval(intervalID);

                // Manage active resource pools
                manageResourcePools(cardCurrency, cardCost, resourcePoolTotal);

                // Determine if balance still needs to be settled
                if (cardCost > 0) {
                    // Proceed to next resource pool
                    deductFromHighestResource();
                }
            }

            var timeoutID = setTimeout(function () {
                jQuery(
                    '[data-resource-field="' +
                        playerField +
                        '"] ' +
                        cardCurrency
                )
                    .find('.resource-counter')
                    .text(resourcePoolTotal);
                resourcePoolTotal -= 1;
            }, 100);

            resourceAdjustmentIteration++;
        }, 100);
    }

    // Manage active resource pools
    function manageResourcePools(currency, cost, poolTotal) {
        // Discard spent card/resource
        jQuery(
            '[data-resource-field="' + playerField + '"] ' + currency + ' .card'
        ).each(function () {
            if (cost > 0) {
                // continue until total cost has been deducted

                // Determine if resource has already been reduced
                if (jQuery(this).is('[data-resource-remaining]')) {
                    cardResource = jQuery(this).attr('data-resource-remaining');
                } else {
                    cardResource = jQuery(this).attr('data-resource-currency');
                }

                // Check cards in pool
                if (cardResource <= cost || poolTotal == cost) {
                    // determine if card resource is less than cost or if the remaining pool total equals cost

                    jQuery(this).addClass('discardCard');

                    // Discard card
                    discardCard();

                    // Update remaining cost for following iteration
                    cost -= cardResource;
                } else if (cardResource > cost) {
                    // resource is greater than remaining cost, reference remaining resource for future deductions

                    cardResourceAdjusted = cardResource - cost;

                    // Account for remaining resource after cost deduction
                    jQuery(this).attr(
                        'data-resource-remaining',
                        cardResourceAdjusted
                    );

                    // Update remaining cost to prevent following iteration
                    cost -= cardResource;
                }
            } else {
                return;
            }
        });

        // Manage active resource pools
        jQuery('[data-resource-field="' + playerField + '"]')
            .find('.activePool')
            .each(function () {
                // Remove active class if resource pool is empty
                if (
                    jQuery(this).children('.activeResource').length <= 0 &&
                    jQuery(this)
                        .find('.resource-counter')
                        .attr('data-pool-wealth') <= 0
                ) {
                    jQuery(this).removeClass('activePool');
                }
            });
    }

    // Find resource pool with highest value for cost deductions
    function deductFromHighestResource() {
        resourcePoolArray = [];

        // Push all values from active resource pools to array
        jQuery('[data-resource-field="' + playerField + '"] .activePool').each(
            function () {
                resourcePoolArray.push(
                    Number(
                        jQuery(this)
                            .find('.resource-counter')
                            .attr('data-pool-wealth')
                    )
                );

                console.log('resourcePoolArray ' + resourcePoolArray);
            }
        );

        Array.max = function (array) {
            return Math.max.apply(Math, array);
        };

        // Retrieve the highest value from array
        resourcePoolMax = Array.max(resourcePoolArray);

        // Retrieve resource pool with matching max value from array and start from there
        jQuery('[data-resource-field="' + playerField + '"] .activePool').each(
            function () {
                if (
                    jQuery(this)
                        .find('.resource-counter')
                        .attr('data-pool-wealth') == resourcePoolMax
                ) {
                    // Determine cardCurrency by currency of resource card
                    if (jQuery(this).hasClass('areo-motiv')) {
                        cardCurrency = '.resource-aero';
                    } else if (jQuery(this).hasClass('terra-motiv')) {
                        cardCurrency = '.resource-terra';
                    } else if (jQuery(this).hasClass('hydro-motiv')) {
                        cardCurrency = '.resource-hydro';
                    } else if (jQuery(this).hasClass('pyro-motiv')) {
                        cardCurrency = '.resource-pyro';
                    }
                }
            }
        );

        resourcePoolTotal = Number(
            jQuery(
                '[data-resource-field="' + playerField + '"] ' + cardCurrency
            )
                .find('.resource-counter')
                .attr('data-pool-wealth')
        );

        resourcePoolAdjusted = resourcePoolTotal - cardCost;

        if (resourcePoolAdjusted < 0) {
            // Adjust cardCost to account for resource deduction
            cardCost *= resourcePoolAdjusted; // expecting negative value for resourcePoolAdjusted
            resourcePoolAdjusted = 0;
        }

        // Update resource reserves
        jQuery('[data-resource-field="' + playerField + '"] ' + cardCurrency)
            .find('.resource-counter')
            .attr('data-pool-wealth', resourcePoolAdjusted);
    }
}

/*
 **
 ** Browse & Preview Phase
 **
 */
var browsingSelection,
    playerHandSource,
    previewPane,
    previewForce,
    previewNerf,
    previewDiscipline,
    previewDescription,
    previewAppellation,
    previewResourceCurrency,
    previewResourceCurrencyHTML,
    previewResourceCost,
    previewResourceCostHTML,
    previewLevellingCost,
    previewLevellingCostHTML,
    previewSupport,
    previewRank;

function browseAndPreview() {
    jQuery('.preview-pane-component').removeClass('inView');
    jQuery('.preview-pane-component .preview-pane-card')
        .children('.card-aperture')
        .remove();

    (playerHandSource = jQuery('.player-hand .focus')
        .parents('.field')
        .attr('data-field')),
        (previewPane = jQuery(
            '.field[data-field="' + playerHandSource + '"]'
        ).find('.preview-pane-component'));

    if (currentPhase != 'previewSelectionPhase') {
        if (handBrowsingPhase) {
            handBrowsingPhase = false;
            formerPhase = 'handBrowsingPhase';
        } else if (casterSelectionPhase) {
            casterSelectionPhase = false;
            formerPhase = 'casterSelectionPhase';
        } else if (supportLevellingPhase) {
            supportLevellingPhase = false;
            formerPhase = 'supportLevellingPhase';
        } else if (levellingPhase) {
            levellingPhase = false;
            formerPhase = 'levellingPhase';
        } else if (supportSelectionPhase) {
            supportSelectionPhase = false;
            formerPhase = 'supportSelectionPhase';
        }
        previewSelectionPhase = true;
        currentPhase = 'previewSelectionPhase';

        // Update phase indicator
        updatePhaseIndicator();
    }

    // Display preview pane
    if (!jQuery(previewPane).hasClass('inView')) {
        jQuery(previewPane).addClass('inView');
    }

    // Append card to preview pane
    browsingSelection = jQuery('.field[data-field="' + playerHandSource + '"]')
        .find('.focus.closed')
        .clone()
        .removeClass('focus closed')
        .appendTo('.inView .preview-pane-card');

    // Reset preview stats
    jQuery('.preview-pane-stats').children().remove();
    jQuery('.preview-pane-stats').removeClass(function (index, className) {
        return (className.match(/(^|\s)stat-discipline-\S+/g) || []).join(' ');
    });

    // Prepare preview stats
    previewRank = jQuery(browsingSelection)
        .find('.card-ranking')
        .children().length;
    previewDiscipline = jQuery(browsingSelection)
        .find('.card-discipline')
        .text();

    if (
        jQuery(browsingSelection)
            .find('.cardFront')
            .hasClass('caster-card-type')
    ) {
        if (jQuery(browsingSelection).find('.card-force-nerfed').length) {
            previewForce = jQuery(browsingSelection)
                .find('.card-force span')
                .text();
            previewNerf = jQuery(browsingSelection)
                .find('.card-marker span')
                .text();
            previewForce =
                '<span>' +
                previewForce +
                ' (-' +
                previewNerf +
                ')<i class="fas fa-asterisk"></i></span><br><small><i class="fas fa-asterisk"></i>Summoning Malady</small>';
        } else {
            previewForce = jQuery(browsingSelection).find('.card-force').text();
        }

        previewResourceCurrency = jQuery(browsingSelection)
            .find('.card-resource-currency')
            .children().length;
        previewResourceCurrencyHTML = jQuery(browsingSelection)
            .find('.card-resource-currency')
            .html();

        if (
            !jQuery(browsingSelection)
                .find('.cardFront')
                .hasClass('neophyte-ranking')
        ) {
            previewLevellingCost = jQuery(browsingSelection)
                .find('.levelling-cost')
                .attr('data-levelling-cost');
            previewLevellingCostHTML = jQuery(browsingSelection)
                .find('.levelling-cost')
                .html();
        }
    }

    if (
        jQuery(browsingSelection)
            .find('.cardFront')
            .hasClass('support-card-type')
    ) {
        previewAppellation = jQuery(browsingSelection)
            .find('.support-title')
            .text();
        previewDescription = jQuery(browsingSelection)
            .find('.support-description')
            .html();
        previewResourceCost = jQuery(browsingSelection)
            .find('.resource-cost')
            .attr('data-resource-cost');
        previewResourceCostHTML = jQuery(browsingSelection)
            .find('.resource-cost')
            .html();
    }

    // Set preview stats
    if (
        jQuery(browsingSelection)
            .find('.cardFront')
            .hasClass('caster-card-type')
    ) {
        jQuery('.preview-pane-stats').prepend(`<div class="stat-force">
                                                          <div class="stat-title">Force:</div>
                                                          <div class="stat-value">${previewForce}</div>
                                                      </div>`);

        jQuery('.preview-pane-stats')
            .prepend(`<div class="stat-resource-currency">
                                                          <div class="stat-title">Reource Value:</div>
                                                          <div class="stat-value">+${previewResourceCurrency}${previewResourceCurrencyHTML}</div>
                                                      </div>`);

        if (
            !jQuery(browsingSelection)
                .find('.cardFront')
                .hasClass('neophyte-ranking')
        ) {
            jQuery('.preview-pane-stats')
                .prepend(`<div class="stat-resource-cost">
                                                              <div class="stat-title">Levelling Cost:</div>
                                                              <div class="stat-value">${previewLevellingCost}${previewLevellingCostHTML}</div>
                                                          </div>`);
        }
    } else if (
        jQuery(browsingSelection)
            .find('.cardFront')
            .hasClass('support-card-type')
    ) {
        jQuery('.preview-pane-stats').prepend(`<div class="stat-description">
                                                          <div class="stat-title">Description:</div>
                                                          <div class="stat-value">${previewDescription}</div>
                                                      </div>`);

        jQuery('.preview-pane-stats').prepend(`<div class="stat-appellation">
                                                          <div class="stat-title">Title:</div>
                                                          <div class="stat-value">${previewAppellation}</div>
                                                      </div>`);

        jQuery('.preview-pane-stats').prepend(`<div class="stat-resource-cost">
                                                          <div class="stat-title">Resource Cost:</div>
                                                          <div class="stat-value">${previewResourceCost}${previewResourceCostHTML}</div>
                                                      </div>`);
    }

    switch (previewDiscipline) {
        case 'aero':
            jQuery('.preview-pane-stats').prepend(`<div class="stat-discipline">
                                                              <div class="stat-title">Discipline:</div>
                                                              <div class="stat-value"><i class="fas fa-cloud-bolt"></i> Aerolurgy</div>
                                                          </div>`);

            // Handle classes
            jQuery('.preview-pane-stats').removeClass(function (
                index,
                className
            ) {
                return (
                    className.match(/(^|\s)stat-discipline-\S+/g) || []
                ).join(' ');
            });
            jQuery('.preview-pane-stats').addClass('stat-discipline-aero');
            break;

        case 'terra':
            jQuery('.preview-pane-stats').prepend(`<div class="stat-discipline">
                                                              <div class="stat-title">Discipline:</div>
                                                              <div class="stat-value"><i class="fas fa-mountain"></i> Terralurgy</div>
                                                          </div>`);

            // Handle classes
            jQuery('.preview-pane-stats').removeClass(function (
                index,
                className
            ) {
                return (
                    className.match(/(^|\s)stat-discipline-\S+/g) || []
                ).join(' ');
            });
            jQuery('.preview-pane-stats').addClass('stat-discipline-terra');
            break;

        case 'pyro':
            jQuery('.preview-pane-stats').prepend(`<div class="stat-discipline">
                                                              <div class="stat-title">Discipline:</div>
                                                              <div class="stat-value"><i class="fas fa-fire"></i> Pyrolurgy</div>
                                                          </div>`);

            // Handle classes
            jQuery('.preview-pane-stats').removeClass(function (
                index,
                className
            ) {
                return (
                    className.match(/(^|\s)stat-discipline-\S+/g) || []
                ).join(' ');
            });
            jQuery('.preview-pane-stats').addClass('stat-discipline-pyro');
            break;

        case 'hydro':
            jQuery('.preview-pane-stats').prepend(`<div class="stat-discipline">
                                                              <div class="stat-title">Discipline:</div>
                                                              <div class="stat-value"><i class="fas fa-droplet"></i> Hydrolurgy</div>
                                                          </div>`);

            // Handle classes
            jQuery('.preview-pane-stats').removeClass(function (
                index,
                className
            ) {
                return (
                    className.match(/(^|\s)stat-discipline-\S+/g) || []
                ).join(' ');
            });
            jQuery('.preview-pane-stats').addClass('stat-discipline-hydro');
            break;
    }

    switch (previewRank) {
        case 0:
            jQuery('.preview-pane-stats').prepend(`<div class="stat-rank">
                                                              <div class="stat-title">Ranking:</div>
                                                              <div class="stat-value">Neophyte</div>
                                                          </div>`);
            break;

        case 1:
            jQuery('.preview-pane-stats').prepend(`<div class="stat-rank">
                                                              <div class="stat-title">Ranking:</div>
                                                              <div class="stat-value">Proficient</div>
                                                          </div>`);
            break;

        case 2:
            jQuery('.preview-pane-stats').prepend(`<div class="stat-rank">
                                                              <div class="stat-title">Ranking:</div>
                                                              <div class="stat-value">Adept</div>
                                                          </div>`);
            break;

        case 3:
            jQuery('.preview-pane-stats').prepend(`<div class="stat-rank">
                                                              <div class="stat-title">Ranking:</div>
                                                              <div class="stat-value">Elite</div>
                                                          </div>`);
            break;

        case 4:
            jQuery('.preview-pane-stats').prepend(`<div class="stat-rank">
                                                              <div class="stat-title">Ranking:</div>
                                                              <div class="stat-value">Peerless</div>
                                                          </div>`);
            break;
    }
}

/*
 **
 ** Browse Hand Phase
 **
 */

// Select with mouse
jQuery('.player-hand').on('mouseover', '.focus.closed', function () {
    if (Player_Session) {
        if (
            (!jQuery('.preview-pane-component').hasClass(
                'preview-pane-delay'
            ) &&
                handBrowsingPhase) ||
            previewSelectionPhase ||
            casterSelectionPhase ||
            levellingPhase ||
            supportLevellingPhase ||
            supportSelectionPhase
        ) {
            browseAndPreview();
        }
    }
});

// Select with mouse
jQuery('.player-hand').on('click', '.focus.closed', function () {
    if (Player_Session) {
        if (
            !jQuery('.preview-pane-component').hasClass('preview-pane-delay') &&
            handBrowsingPhase
        ) {
            browseAndPreview();
        } else if (
            formerPhase == 'handBrowsingPhase' ||
            formerPhase == 'casterConfirmationPhase'
        ) {
            keySelectCaster();
        } else if (
            formerPhase == 'resourcePoolingPhase' ||
            formerPhase == 'resourceConfirmationPhase'
        ) {
            keySelectResource();
        } else if (
            formerPhase == 'casterSelectionPhase' ||
            formerPhase == 'casterConfirmationPhase'
        ) {
            keySelectCaster();
        } else if (
            formerPhase == 'supportLevellingPhase' ||
            formerPhase == 'supportConfirmationPhase'
        ) {
            keySelectSupport();
        } else if (
            formerPhase == 'levellingPhase' ||
            formerPhase == 'casterConfirmationPhase'
        ) {
            keySelectCaster();
        } else if (
            formerPhase == 'supportSelectionPhase' ||
            formerPhase == 'supportConfirmationPhase'
        ) {
            keySelectSupport();
        }
    }
});

// Select with keys
function keyViewSelection() {
    if (Player_Session) {
        if (
            (!jQuery('.preview-pane-component').hasClass(
                'preview-pane-delay'
            ) &&
                handBrowsingPhase) ||
            previewSelectionPhase ||
            casterSelectionPhase ||
            levellingPhase ||
            supportLevellingPhase ||
            supportSelectionPhase
        ) {
            browseAndPreview();
        }
    }
}

/*
 **
 ** Preview Selection Phase
 **
 */

// Dismiss with mouse
jQuery('.field').on('click', '.preview-pane-dismiss', function () {
    if (Player_Session) {
        keyDismissPreview();
    }
});

// Dismiss with keys
function keyDismissPreview() {
    if (Player_Session) {
        previewSelectionPhase = false;
        if (jQuery('.minimized-dialogueBox').length) {
            // if dialogue box is still docked, player has not officially accepted hand...

            handBrowsingPhase = true;
            formerPhase = 'previewSelectionPhase';
            currentPhase = 'handBrowsingPhase';

            // Maximize docked dialogue box
            jQuery('.minimized-dialogueBox .dialogueBox-maximize').trigger(
                'click'
            );
        } else if (formerPhase == 'casterSelectionPhase') {
            // ...else player has implicitly accepted hand by previous attempt at placing card into play

            casterSelectionPhase = true;
            formerPhase = 'previewSelectionPhase';
            currentPhase = 'casterSelectionPhase';
        } else if (formerPhase == 'supportLevellingPhase') {
            supportLevellingPhase = true;
            formerPhase = 'previewSelectionPhase';
            currentPhase = 'supportLevellingPhase';
        } else if (formerPhase == 'levellingPhase') {
            levellingPhase = true;
            formerPhase = 'previewSelectionPhase';
            currentPhase = 'levellingPhase';
        } else if (formerPhase == 'supportSelectionPhase') {
            supportSelectionPhase = true;
            formerPhase = 'previewSelectionPhase';
            currentPhase = 'supportSelectionPhase';
        }

        // Update phase indicator
        updatePhaseIndicator();

        // Dismiss preview pane
        jQuery('.preview-pane-component')
            .removeClass('inView')
            .addClass('preview-pane-delay');

        // Remove delay
        setTimeout(function () {
            jQuery('.preview-pane-component').removeClass('preview-pane-delay');
        }, 1000);
    }
}

/*
 **
 ** Progression Confirmation
 **
 */

function determineProgressionConfirmation(confirmProgression) {
    // Continue based on condition returned
    if (confirmProgression == 'true') {
        // player accepts support levelling

        // Construct player attributes
        constructPlayerAttributes(true, true); // player, ai

        toggleDialogueBox(false, true);

        if (formerPhase == 'resourceConfirmationPhase') {
            supportLevellingPhase = true; // start resource pooling phase and allow UI key navigation
            currentPhase = 'supportLevellingPhase';

            // Update phase indicator
            updatePhaseIndicator();

            // Update and display phase guide
            guideInstruction =
                'Select a valid support levelling card to place in play';
            updatePhaseGuide(guideInstruction, currentPhase);

            // Mark valid selection options
            markValidSelections('levelling-card-type');

            // Prepare support card aperture
            enableSupportAperture();
        }
    } else if (confirmProgression == 'false') {
        // player rejects support levelling

        toggleDialogueBox(false, true);

        if (formerPhase == 'resourceConfirmationPhase') {
            // Determine if standard levelling is possible
            if (promoteRankPossibility()) {
                // check for standard levelling requirements

                //Remove force nerfs
                restoreForce();

                levellingPhase = true; // start resource pooling phase and allow UI key navigation
                currentPhase = 'levellingPhase';

                // Update phase indicator
                updatePhaseIndicator();

                // Update and display phase guide
                guideInstruction = 'Select a valid caster card to promote to';
                updatePhaseGuide(guideInstruction, currentPhase);
            } else {
                // rank promotion not possible, proceed to before support preparation
            }
        }
    }
}

/*
 **
 ** Discard Card
 **
 */

// Discard card
function discardCard() {
    // get co-ordinates and dimensions of the dead pile
    var deadPile = jQuery(playerHand).find('.dead-pile');
    (deadPileOffset = jQuery(deadPile).offset()),
        (deadPileTop = deadPileOffset.top),
        (deadPileLeft = deadPileOffset.left),
        (deadPileWidth = jQuery(deadPile).outerHeight()),
        (deadPileHeight = jQuery(deadPile).outerWidth());

    var current_discardingCard = jQuery('.discardCard'), // store to variable
        current_aperture = jQuery(current_discardingCard).parent(),
        current_clonedCard;

    // Epheremal state handler
    jQuery(current_aperture).addClass('placingCard');

    // Retrieve co-ordinates and dimensions of card aperture
    var cardApertureOffset = jQuery(current_aperture).offset(),
        cardApertureTop = cardApertureOffset.top,
        cardApertureLeft = cardApertureOffset.left;

    // Set relative co-ordinates
    var relativeTop = deadPileTop - cardApertureTop,
        relativeLeft = deadPileLeft - cardApertureLeft;

    // Remove classes
    jQuery(current_discardingCard).removeClass(
        'activeCard activeCaster activeResource'
    );
    jQuery(current_discardingCard).removeClass(function (index, className) {
        // remove the clone iteration reference
        return (className.match(/(^|\s)clone-iteration-\S+/g) || []).join(' ');
    });

    // Discarding card
    jQuery(current_discardingCard).addClass('idleCard scaleSmall speedX3');
    jQuery(current_discardingCard).css({
        top: relativeTop,
        left: relativeLeft,
        width: deadPileWidth,
        height: deadPileHeight,
    }); // in motion
    jQuery(current_discardingCard)
        .clone()
        .appendTo(deadPile)
        .removeClass('speedX2 discardCard')
        .addClass('ghostCard deadCard'); // clone the modified card and add to dead pile
    current_clonedCard = jQuery('.deadCard');

    setTimeout(function () {
        jQuery(current_discardingCard).remove();
        jQuery(current_clonedCard).css({ top: '0', left: '0' }); // lock in position
        jQuery(current_clonedCard).removeClass('ghostCard');
        jQuery(current_aperture).removeClass('placingCard');
    }, 500);
}

/*
 **
 ** Ignore Key Input
 **
 */
function keyVoid() {
    return;
}

/*
 **
 ** Navigating Elements
 **
 */
var keyReleased = false,
    keyPressed = true;

function keyNavigation() {
    jQuery(document).on('keyup', function (e) {
        keyReleased = true;
    });

    jQuery(document).on('keydown', function (e) {
        if (keyReleased) {
            keyPressed = true;
        }

        if (keyPressed) {
            keyPressed = false;

            var key = e.key;

            if (turnSelectionPhase) {
                var elClass = '.turnCard',
                    parentEl = '.turnCard-selection',
                    callbackFunction = keyTurnSelect,
                    returnFunction = keyVoid,
                    applicableEl = '.turnCard',
                    notApplicableEl = '';
            } else if (casterSelectionPhase && Player_Session) {
                var elClass = '.card-aperture',
                    parentEl = '.player-hand',
                    callbackFunction = keySelectCaster,
                    returnFunction = keyVoid,
                    applicableEl = '.valid-for-selection',
                    notApplicableEl = '.invalid-for-selection, .open';
            } else if (resourcePoolingPhase && Player_Session) {
                var elClass = '.card-aperture',
                    parentEl = '.player-hand',
                    callbackFunction = keySelectResource,
                    returnFunction = keyVoid,
                    applicableEl = '.valid-for-selection',
                    notApplicableEl = '.invalid-for-selection, .open';
            } else if (supportLevellingPhase && Player_Session) {
                var elClass = '.card-aperture',
                    parentEl = '.player-hand',
                    callbackFunction = keySelectSupport,
                    returnFunction = keyVoid,
                    applicableEl = '.valid-for-selection',
                    notApplicableEl = '.invalid-for-selection, .open';
            } else if (levellingPhase && Player_Session) {
                var elClass = '.card-aperture',
                    parentEl = '.player-hand',
                    callbackFunction = keySelectCaster,
                    returnFunction = keyVoid,
                    applicableEl = '.valid-for-selection',
                    notApplicableEl = '.invalid-for-selection, .open';
            } else if (supportSelectionPhase && Player_Session) {
                var elClass = '.card-aperture',
                    parentEl = '.player-hand',
                    callbackFunction = keySelectSupport,
                    returnFunction = keyVoid,
                    applicableEl = '.valid-for-selection',
                    notApplicableEl = '.invalid-for-selection, .open';
            } else if (handConfirmationPhase && Player_Session) {
                var elClass = '.btn',
                    parentEl = '.confirm-options',
                    callbackFunction = keyConfirmation,
                    returnFunction = toggleDockDialogueBox,
                    applicableEl = '.btn-confirm',
                    notApplicableEl = '';
            } else if (handBrowsingPhase && Player_Session) {
                var elClass = '.card-aperture',
                    parentEl = '.player-hand',
                    callbackFunction = keySelectCaster,
                    returnFunction = toggleDockDialogueBox,
                    applicableEl = '.closed',
                    notApplicableEl = '.open';
            } else if (previewSelectionPhase && Player_Session) {
                var elClass = '.card-aperture',
                    parentEl = '.player-hand',
                    callbackFunction = keySelectCaster,
                    returnFunction = keyDismissPreview,
                    applicableEl = '.closed',
                    notApplicableEl = '.open';
            } else if (casterConfirmationPhase && Player_Session) {
                var elClass = '.btn',
                    parentEl = '.confirm-options',
                    callbackFunction = keyConfirmation,
                    returnFunction = afterDialogueBoxDismissal,
                    applicableEl = '.btn-confirm',
                    notApplicableEl = '';
            } else if (resourceConfirmationPhase && Player_Session) {
                var elClass = '.btn',
                    parentEl = '.confirm-options',
                    callbackFunction = keyConfirmation,
                    returnFunction = afterDialogueBoxDismissal,
                    applicableEl = '.btn-confirm',
                    notApplicableEl = '';
            } else if (supportConfirmationPhase && Player_Session) {
                var elClass = '.btn',
                    parentEl = '.confirm-options',
                    callbackFunction = keyConfirmation,
                    returnFunction = afterDialogueBoxDismissal,
                    applicableEl = '.btn-confirm',
                    notApplicableEl = '';
            } else if (proceedConfirmationPhase && Player_Session) {
                var elClass = '.btn',
                    parentEl = '.confirm-options',
                    callbackFunction = keyConfirmation,
                    returnFunction = afterDialogueBoxDismissal,
                    applicableEl = '.btn-confirm',
                    notApplicableEl = '';
            }

            if (jQuery(parentEl).find(applicableEl).hasClass('focus')) {
                agentFocus(
                    key,
                    elClass,
                    parentEl,
                    callbackFunction,
                    returnFunction,
                    applicableEl,
                    notApplicableEl
                );
            } else {
                agentFocus(
                    key,
                    elClass,
                    parentEl,
                    callbackFunction,
                    returnFunction,
                    applicableEl,
                    notApplicableEl
                );
            }
        }
    });
}

/*
 **
 ** Key Input Navigation
 **
 */
function agentFocus(
    key,
    el,
    parent,
    callbackFunction,
    returnFunction,
    applicable,
    notApplicable
) {
    var focusEl = jQuery(el + '.focus');

    function arrowRightUp() {
        // are there more than one element in the set that can be focussed on?
        if (jQuery(applicable).length > 1) {
            if (
                // is there an element following the current element?
                (jQuery(focusEl).next().length &&
                    // and is it one that can be focussed on?
                    jQuery(focusEl).next().is(applicable)) || // OR
                // is there an element following the current element?
                (jQuery(focusEl).next().length &&
                    // and is it one that cannot be focussed on?
                    jQuery(focusEl).next().is(notApplicable) &&
                    // and is it not the last element in the set?
                    jQuery(focusEl).next().is(':not(:last-child)'))
            ) {
                // determine if there are any applicable elements following the current focussed element
                if (jQuery(focusEl).nextAll(applicable).length) {
                    jQuery(focusEl)
                        .removeClass('focus')
                        .nextAll(applicable)
                        .first()
                        .addClass('focus'); // check all and apply class to first applicable element
                } else {
                    jQuery(focusEl).removeClass('focus'); // remove class from current focus element
                    jQuery(parent)
                        .children(applicable)
                        .first()
                        .addClass('focus'); // reset focus on first applicable element of the containing element
                }
            } else if (
                // is there an element following the current element?
                jQuery(focusEl).next().length &&
                // and is it one that cannot be focussed on?
                jQuery(focusEl).next().is(notApplicable) &&
                // and is it the last element in the set?
                jQuery(focusEl).next().is(':last-child')
            ) {
                jQuery(focusEl).removeClass('focus'); // remove class from current focus element
                jQuery(applicable).first().addClass('focus'); // reset focus on the first element that can be focussed on (the first applicable element)
            } else {
                // otherwise just reset the focus
                jQuery(focusEl).removeClass('focus'); // remove class from current focus element
                jQuery(parent).children(applicable).first().addClass('focus'); // reset focus on first applicable element of the containing element
            }
        } else {
            // is it the only applicable element left in the set that can be focussed on?

            // is the last applicable element left not already focussed on?
            if (
                !jQuery(parent).children(applicable).first().hasClass('focus')
            ) {
                jQuery(parent).children(applicable).first().addClass('focus');
            }
        }
    }

    function arrowLeftDown() {
        // are there more than one element in the set that can be focussed on?
        if (jQuery(applicable).length > 1) {
            if (
                // is there an element preceding the current element?
                (jQuery(focusEl).prev().length &&
                    // and is it one that can be focussed on?
                    jQuery(focusEl).prev().is(applicable)) || // OR
                // is there an element preceding the current element?
                (jQuery(focusEl).prev().length &&
                    // and is it one that cannot be focussed on?
                    jQuery(focusEl).prev().is(notApplicable) &&
                    // and is it not the first element in the set?
                    jQuery(focusEl).prev().is(':not(:first-child)'))
            ) {
                // determine if there are any applicable elements preceding the current focussed element
                if (jQuery(focusEl).prevAll(applicable).length) {
                    jQuery(focusEl)
                        .removeClass('focus')
                        .prevAll(applicable)
                        .first()
                        .addClass('focus'); // check all and apply class to first applicable element
                } else {
                    jQuery(focusEl).removeClass('focus'); // remove class from current focus element
                    jQuery(parent)
                        .children(applicable)
                        .last()
                        .addClass('focus'); // reset focus on last applicable element of the containing element
                }
            } else if (
                // is there an element preceding the current element?
                jQuery(focusEl).prev().length &&
                // and is it one that cannot be focussed on?
                jQuery(focusEl).prev().is(notApplicable) &&
                // and is it the first element in the set?
                jQuery(focusEl).prev().is(':first-child')
            ) {
                jQuery(focusEl).removeClass('focus'); // remove class from current focus element
                jQuery(applicable).last().addClass('focus'); // reset focus on the last element that can be focussed on (the last applicable element)
            } else {
                // otherwise just reset the focus
                jQuery(focusEl).removeClass('focus'); // remove class from current focus element
                jQuery(parent).children(applicable).last().addClass('focus'); // reset focus on last applicable element of the containing element
            }
        } else {
            // is it the only applicable element left in the set that can be focussed on?

            // is the last applicable element left not already focussed on?
            if (
                !jQuery(parent).children(applicable).first().hasClass('focus')
            ) {
                jQuery(parent).children(applicable).first().addClass('focus');
            }
        }
    }

    function switchHands(key) {
        var current_field = jQuery('.focus')
            .parents('.field')
            .attr('data-field');
        jQuery(applicable).removeClass('focus');

        if (key == 'ArrowUp') {
            if (
                jQuery('.field[data-field!="' + current_field + '"]').find(
                    applicable
                ).length
            ) {
                jQuery('.field[data-field!="' + current_field + '"]')
                    .find(applicable)
                    .first()
                    .addClass('focus');
            } else {
                arrowRightUp();
            }
        } else if (key == 'ArrowDown') {
            if (
                jQuery('.field[data-field!="' + current_field + '"]').find(
                    applicable
                ).length
            ) {
                jQuery('.field[data-field!="' + current_field + '"]')
                    .find(applicable)
                    .last()
                    .addClass('focus');
            } else {
                arrowLeftDown();
            }
        }
    }

    switch (key) {
        case 'ArrowRight':
            arrowRightUp();

            // Display preview selection
            if (
                handBrowsingPhase ||
                previewSelectionPhase ||
                casterSelectionPhase ||
                levellingPhase ||
                supportLevellingPhase ||
                supportSelectionPhase
            ) {
                keyViewSelection();
            }

            break;

        case 'ArrowLeft':
            arrowLeftDown();

            // Display preview selection
            if (
                handBrowsingPhase ||
                previewSelectionPhase ||
                casterSelectionPhase ||
                levellingPhase ||
                supportLevellingPhase ||
                supportSelectionPhase
            ) {
                keyViewSelection();
            }

            break;

        case 'ArrowUp':
            if (
                handBrowsingPhase ||
                previewSelectionPhase ||
                casterSelectionPhase ||
                levellingPhase ||
                supportLevellingPhase ||
                supportSelectionPhase
            ) {
                switchHands(key);

                // Display preview selection
                keyViewSelection();
            } else {
                arrowRightUp();
            }
            break;

        case 'ArrowDown':
            if (
                handBrowsingPhase ||
                previewSelectionPhase ||
                casterSelectionPhase ||
                levellingPhase ||
                supportLevellingPhase ||
                supportSelectionPhase
            ) {
                switchHands(key);

                // Display preview selection
                keyViewSelection();
            } else {
                arrowLeftDown();
            }
            break;

        case 'Enter':
            callbackFunction();
            break;

        case 'Escape':
            returnFunction();
            break;
    }
}

/*
 **
 ** Helper Functions
 **
 */

// Return greatest force value from hand
function returnMaxForce(playerHand, cardAperture, cardType) {
    var forceArray = [],
        forceValue,
        forceMax;

    jQuery(playerHand)
        .find(cardAperture + ' ' + cardType + ' .card-attributes')
        .each(function () {
            // Retrieve force value
            forceValue = jQuery(this).attr('data-force');

            // Push force value to force array
            forceArray.push(forceValue);
        });

    // Retrieve the greatest force value from array
    return (forceMax = Math.max.apply(null, forceArray));
}

// Return minimum force value from hand
function returnMinForce(playerHand, cardAperture, cardType) {
    var forceArray = [],
        forceValue,
        forceMin;

    jQuery(playerHand)
        .find(cardAperture + ' ' + cardType + ' .card-attributes')
        .each(function () {
            // Retrieve force value
            forceValue = jQuery(this).attr('data-force');

            // Push force value to force array
            forceArray.push(forceValue);
        });

    // Retrieve the minimum force value from array
    return (forceMin = Math.min.apply(null, forceArray));
}

// Return greatest resource value from hand
function returnMaxResource(playerHand, cardAperture, cardType) {
    var resourceArray = [],
        resourceValue,
        resourceMix;

    jQuery(playerHand)
        .find(cardAperture + ' ' + cardType + ' .card-attributes')
        .each(function () {
            // Retrieve resource value
            resourceValue = jQuery(this).attr('data-currency');

            // Push force value to resource array
            resourceArray.push(resourceValue);
        });

    // Retrieve the greatest resource value from array
    return (resourceMax = Math.max.apply(null, resourceArray));
}

// Return minimum resource value from hand
function returnMinResource(playerHand, cardAperture, cardType) {
    var resourceArray = [],
        resourceValue,
        resourceMin;

    jQuery(playerHand)
        .find(cardAperture + ' ' + cardType + ' .card-attributes')
        .each(function () {
            // Retrieve resource value
            resourceValue = jQuery(this).attr('data-currency');

            // Push force value to resource array
            resourceArray.push(resourceValue);
        });

    // Retrieve the minimum resource value from array
    return (resourceMin = Math.min.apply(null, resourceArray));
}

/*
 **
 ** Support Effects
 **
 */

/*
 ** On AI Support Actions
 */
// Outcome Based Assessment Score:
// Every support card is evaluated and attributed an OBAS calculated by a number of circumstancial factors at the time of play,
// applicable in instances where multiple support cards are available, the support card with the greatest OBAS will be selected.
// OBAS will be determined by greatest possibility of speculated success
// OBAS is invoked at the beginning of AI support phase
// Efficacy of support cards are established, ineffective support cards are attributed an OBAS of 0 and excluded from consideration,
// remaining support card OBAS are calculated and established on conjected outcomes
// Conclusions are drawn based on readily available information referenced from objects storing information on AI hand and deck and Player hand and deck

/*
 ** 100 -> Level Acceleration 			: Advance a Caster's rank by one tier at no levelling cost.								| Usage: Levelling Phase 	| Rank: neophyte
 ** 101 -> Level Retrograde 				: Revert a Caster's rank to its previous tier.											| Usage: Levelling Phase 	| Rank: proficient
 ** 102 -> Level Circumvention 			: Bypass following tier and advance a Caster's rank x2 levels up.						| Usage: Levelling Phase 	| Rank: adept
 ** 103 -> Level Exchange 				: Exchange Caster with any other Caster of the same rank regardless of discipline.		| Usage: Levelling Phase 	| Rank: neophyte
 ** 104 -> Level Speciality Indifference : Advance a Caster's rank by one tier regardless of discipline.							| Usage: Levelling Phase 	| Rank: proficient
 ** 105 -> Level Relegation 				: Revert an opponent's Caster's rank by one tier.										| Usage: Levelling Phase 	| Rank: elite
 ** 106 -> Negligible Designation 		: Revert an opponent's Caster's rank back to the first tier.							| Usage: Levelling Phase 	| Rank: peerless
 ** 107 -> Negligible Succession 		: Advance or regress a Caster's rank to any tier and discipline at no levelling cost.	| Usage: Levelling Phase 	| Rank: peerless
 */

// Reference and invoke support effect
function invokeSupportEffect(id) {
    switch (id) {
        case 100:
            levelAcceleration();
            break;

        case 101:
            levelRetrograde();
            break;

        case 102:
            levelCircumvention();
            break;

        case 103:
            levelExchange();
            break;

        case 104:
            levelSpecialityIndifference();
            break;

        case 105:
            levelRelegation();
            break;

        case 106:
            negligibleDesignation();
            break;

        case 107:
            negligibleSuccession();
            break;
    }
}

//Support Effect function definitions

/*
 ** ID: 100
 */
// Level Acceleration
// Advance a Caster's rank by one tier at no levelling cost.
// Usage: Levelling Phase
// Requirement: Must share same discipline
// Exception: Not possible in deviant states
// Rank: neophyte
function levelAcceleration() {}

/*
 **
 ** Player & AI Attributes
 **
 */

// Define player attributes
var inPlayCaster, inHand, attributesPlayer, attributesAI;

// Attribute object constructors
function AttributesConstr(
    hasCasterInPlay,
    inPlayCaster,
    isLevelledCaster,
    inHand,
    deckDesciplines
) {
    this.hasCasterInPlay = hasCasterInPlay;
    this.inPlayCaster = inPlayCaster;
    this.isLevelledCaster = isLevelledCaster;
    this.inHand = inHand;
    this.deckDisciplines = deckDisciplines;
}

// Construct player/AI attributes object for support reference and AI processing reference
function constructAttributes(field) {
    var attributesObj;

    // Define player's in-play caster
    hasCasterInPlay =
        jQuery('[data-battle-field="' + field + '"] .in-play').find('.card')
            .length >= 1
            ? true
            : false;
    inPlayCaster = jQuery('[data-battle-field="' + field + '"] .in-play .card');
    isLevelledCaster =
        jQuery('[data-battle-field="' + field + '"] .in-play .card').length > 1
            ? true
            : false;
    inHand = {};

    // Define player attributes object
    attributesObj = new AttributesConstr(
        hasCasterInPlay,
        inPlayCaster,
        isLevelledCaster,
        inHand,
        deckDisciplines
    );

    // Define cards in hand
    if (jQuery('[data-field="' + field + '"] .player-hand .card').length) {
        jQuery('[data-field="' + field + '"] .player-hand .card').each(
            function (i) {
                let cardRanking = jQuery(this)
                        .find('.card-attributes')
                        .attr('data-rank'),
                    cardDiscipline = jQuery(this)
                        .find('.card-attributes')
                        .attr('data-discipline'),
                    cardForce = jQuery(this)
                        .find('.card-attributes')
                        .attr('data-force'),
                    cardType = jQuery(this)
                        .find('.card-attributes')
                        .attr('data-type'),
                    cardTitle = jQuery(this)
                        .find('.card-attributes')
                        .attr('data-appellation')
                        ? jQuery(this)
                              .find('.card-attributes')
                              .attr('data-appellation')
                        : 'none',
                    cardIndex = i,
                    cardInHand = {
                        cardRanking,
                        cardDiscipline,
                        cardForce,
                        cardType,
                        cardTitle,
                        cardIndex,
                    };

                // Assign card detials to attributes object
                attributesObj.inHand['cardInHand' + i] = cardInHand;
            }
        );
    }

    // Return object post construction
    return attributesObj;
}

// Invoke applicable function to construct player/AI attributes
function constructPlayerAttributes(playerAttributes, aiAttributes) {
    if (playerAttributes) {
        // Constuct player attributes
        attributesPlayer = constructAttributes('player-field');
        //console.log(attributesPlayer);
    }
    if (aiAttributes) {
        // Constuct AI attributes
        attributesAI = constructAttributes('ai-field');
        //console.log(attributesAI);
    }
}

// Check if card exists by finding specified object property value
function isCardInHand(obj, prop, val) {
    var objProp;

    switch (prop) {
        case 'cardDiscipline':
            objProp = obj.cardDiscipline;
            break;
        case 'cardRanking':
            objProp = obj.cardRanking;
            break;
        case 'cardTitle':
            objProp = obj.cardTitle;
            break;
        case 'cardType':
            objProp = obj.cardType;
            break;
        default:
        //console.log('no case for property value '+prop);
    }

    //Early return
    if (objProp === val) {
        return obj;
    }
    var isInHand, prop;
    for (prop in obj) {
        if (obj.hasOwnProperty(prop) && typeof obj[prop] === 'object') {
            isInHand = isCardInHand(obj[prop], val);
            if (isInHand) {
                isInHand = true;
                return isInHand;
            }
        }
    }
    isInHand = false;
    return isInHand;
}

/*
 **
 ** AI Automated Processes
 **
 */

// AI Caster Selection
function AIcasterSelection(aiHand) {
    // Update and display phase guide
    guideInstruction = 'Placing Card...';
    updatePhaseGuide(guideInstruction, currentPhase);

    // Reference object of player attributes for AI processes to reference to determine viable and logical actions

    // Determine player card force, rank, and discipline or potential discipline threat level and define choice to counteract this
    // - discipline advantage prioritized,
    // - the greatest force value will be selected
    /* 
              Data driven decision making & evaluation
               AI will evaluate and define choices based on aforementioned indicating factors determined by: 
                   1. observational factors: player's active card in play
                   2. observational factors: cards in player's hand  
                   3. predicting factors: known information about the player's deck (discipline ratios)
          */

    var forceMax = returnMaxForce(
        aiHand,
        '.valid-for-selection',
        '.neophyte-ranking'
    );

    // Find the card with the greatest force value and add selection class to card and reference classe to aperture
    jQuery(aiHand)
        .find('.valid-for-selection .neophyte-ranking .card-attributes')
        .each(function () {
            if (jQuery(this).attr('data-force') == forceMax) {
                jQuery(this)
                    .closest('.card')
                    .addClass('casterSelection')
                    .closest('.valid-for-selection')
                    .addClass('AIfocus');
                return false; // exit loop
            }
        });

    cardAperture = jQuery('.valid-for-selection.AIfocus');
    casterSelection = jQuery('.casterSelection');
    aiField = jQuery(aiHand).attr('data-field');

    setTimeout(function () {
        placeInPlay(casterSelection, aiField, cardAperture);

        // Delayed Upkeep
        setTimeout(function () {
            // Construct player attributes
            constructPlayerAttributes(true, true); // player, ai

            //Remove force nerfs
            restoreForce();

            jQuery('.card-aperture').removeClass('tetherCard'); // remove card tether reference
            jQuery('.card-aperture').removeClass('AIfocus'); // remove card card aperture reference

            // Reset hitpoint reversal reference
            jQuery('[data-battle-field="' + aiField + '"]')
                .find('.hitpoint-percentile')
                .attr('data-revert-hitpoints', '0');

            // Remove the activeCaster class on any caster cards lower down the stacking order (essential for Levelling Phases)
            if (
                jQuery('[data-battle-field="' + aiField + '"] .in-play').find(
                    '.activeCaster'
                ).length > 1
            ) {
                jQuery('[data-battle-field="' + aiField + '"] .in-play')
                    .find('.activeCaster')
                    .not(':last')
                    .removeClass('activeCaster');
            }

            // Determine progression based on field conditions
            preliminarySupportPhase();
        }, 2000);
    }, 1000);
}

// AI Resource Selection
function AIresourceSelection(aiHand) {
    // Update and display phase guide
    guideInstruction = 'Pooling Resource...';
    updatePhaseGuide(guideInstruction, currentPhase);

    var resourceArray = [],
        resourceValue,
        resourceMax,
        resourceCurrency,
        resourceCurrencyAvailable = false;

    resourceCurrency = jQuery('[data-battle-field="ai-field"]')
        .find('.in-play .card .card-attributes')
        .attr('data-discipline');

    // Detemine if any resource currency of the same discipline is available
    jQuery(aiHand)
        .find('.valid-for-selection .card .card-attributes')
        .each(function () {
            if (jQuery(this).attr('data-discipline') == resourceCurrency) {
                resourceCurrencyAvailable = true;
                return false; // exit loop
            }
        });

    jQuery(aiHand)
        .find('.valid-for-selection .card .card-attributes')
        .each(function () {
            if (resourceCurrencyAvailable) {
                // ...if resource currency of the same discipline is available consider only the these values

                if (jQuery(this).attr('data-discipline') == resourceCurrency) {
                    // Retrieve resource value
                    resourceValue = jQuery(this).attr('data-currency');

                    // Push resource value to resource array
                    resourceArray.push(resourceValue);
                }
            } else {
                // ...else consider all values of any resource currency

                // Retrieve resource value
                resourceValue = jQuery(this).attr('data-currency');

                // Push resource value to resource array
                resourceArray.push(resourceValue);
            }
        });

    // Retrieve the greatest resource value from array
    resourceMax = Math.max.apply(null, resourceArray);

    // Find the card with the greatest resource value and add selection class to card and reference class to aperture
    jQuery(aiHand)
        .find('.valid-for-selection .card .card-attributes')
        .each(function () {
            if (resourceCurrencyAvailable) {
                // ...if resource currency of the same discipline is available search for greatest value

                if (jQuery(this).attr('data-discipline') == resourceCurrency) {
                    if (jQuery(this).attr('data-currency') == resourceMax) {
                        var forceMin = returnMinForce(
                            aiHand,
                            '.valid-for-selection',
                            '.' + resourceCurrency + '-motiv'
                        );

                        if (jQuery(this).attr('data-force') == forceMin) {
                            jQuery(this)
                                .closest('.card')
                                .addClass('resourceSelection')
                                .closest('.valid-for-selection')
                                .addClass('AIfocus');
                            return false; // exit loop
                        }
                    }
                }
            } else {
                // ...else search for the greatest value of any resource currency

                if (jQuery(this).attr('data-currency') == resourceMax) {
                    var forceMin = returnMinForce(
                        aiHand,
                        '.valid-for-selection',
                        '.card'
                    );

                    if (jQuery(this).attr('data-force') == forceMin) {
                        jQuery(this)
                            .closest('.card')
                            .addClass('resourceSelection')
                            .closest('.valid-for-selection')
                            .addClass('AIfocus');
                        return false; // exit loop
                    }
                }
            }
        });

    cardAperture = jQuery('.valid-for-selection.AIfocus');
    resourceSelection = jQuery('.resourceSelection');
    aiField = jQuery(aiHand).attr('data-field');

    setTimeout(function () {
        placeInPool(resourceSelection, aiField, cardAperture);

        // Delayed Upkeep
        setTimeout(function () {
            // Construct player attributes
            constructPlayerAttributes(true, true); // player, ai

            jQuery('.card-aperture').removeClass('tetherCard'); // remove card tether reference
            jQuery('.card-aperture').removeClass('AIfocus'); // remove card card aperture reference
            jQuery('.resource').removeClass('poolingResource'); // remove resource pool reference
            jQuery('.resource-aperture').removeClass('activeResource'); // remove aperture reference

            // Remove resource value tags
            removeResourceValueTags();

            // Unmark valid selection options
            unmarkValidSelections();

            // Determine if ranking is possible
            if (supportLevellingPossibility()) {
                // check for support leveling cards

                console.log('AI support levelling phase');
            } else if (promoteRankPossibility()) {
                // check for standard levelling requirements

                console.log('AI standard levelling phase');

                //Remove force nerfs
                restoreForce();

                levellingPhase = true;
                currentPhase = 'levellingPhase';

                // Update and display phase guide
                guideInstruction = 'Levelling Caster...';
                updatePhaseGuide(guideInstruction, currentPhase);

                var AIcasterNextRank = jQuery('[data-battle-field="ai-field"]')
                        .find('.in-play .card .card-attributes')
                        .attr('data-rank-next'),
                    AIcasterDiscipline = jQuery(
                        '[data-battle-field="ai-field"]'
                    )
                        .find('.in-play .card .card-attributes')
                        .attr('data-discipline');

                var forceMax = returnMaxForce(
                    aiHand,
                    '.valid-for-selection',
                    '.' +
                        AIcasterNextRank +
                        '-ranking.' +
                        AIcasterDiscipline +
                        '-motiv'
                );

                jQuery('.valid-for-selection').each(function () {
                    if (
                        jQuery(this)
                            .find('.card-attributes')
                            .attr('data-force') == forceMax
                    ) {
                        jQuery(this).addClass('AIfocus');
                        jQuery(this).find('.card').addClass('casterSelection');
                    }
                });

                cardAperture = jQuery('.valid-for-selection.AIfocus');
                casterSelection = jQuery('.casterSelection');
                aiField = jQuery(aiHand).attr('data-field');

                setTimeout(function () {
                    placeInPlay(casterSelection, aiField, cardAperture);

                    // Delayed Upkeep
                    setTimeout(function () {
                        // Construct player attributes
                        constructPlayerAttributes(true, true); // player, ai

                        jQuery('.card-aperture').removeClass('tetherCard'); // remove card tether reference
                        jQuery('.card-aperture').removeClass('AIfocus'); // remove card card aperture reference

                        // Reset hitpoint reversal reference
                        jQuery('[data-battle-field="' + aiField + '"]')
                            .find('.hitpoint-percentile')
                            .attr('data-revert-hitpoints', '0');

                        // Remove the activeCaster class on any caster cards lower down the stacking order (essential for Levelling Phases)
                        if (
                            jQuery(
                                '[data-battle-field="' + aiField + '"] .in-play'
                            ).find('.activeCaster').length > 1
                        ) {
                            jQuery(
                                '[data-battle-field="' + aiField + '"] .in-play'
                            )
                                .find('.activeCaster')
                                .not(':last')
                                .removeClass('activeCaster');
                        }

                        levellingPhase = false;
                        formerPhase = 'levellingPhase';

                        // Determine progression based on field conditions
                        preliminarySupportPhase();
                    }, 2000);
                }, 1000);
            } else {
                // Determine progression based on field conditions
                preliminarySupportPhase();
            }
        }, 2000);
    }, 1000);
}

// AI Support Selection
function AIsupportSelection(aiHand) {
    // Delayed Upkeep
    setTimeout(function () {
        // Construct player attributes
        constructPlayerAttributes(true, true); // player, ai
    }, 2000);
}
