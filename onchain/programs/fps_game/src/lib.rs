use anchor_lang::prelude::*;

declare_id!("Fgme111111111111111111111111111111111111111");

#[program]
pub mod fps_game {
    use super::*;

    pub fn create_match(ctx: Context<CreateMatch>, match_id: u64, win_points: u8) -> Result<()> {
        let match_account = &mut ctx.accounts.match_account;
        match_account.owner = ctx.accounts.owner.key();
        match_account.match_id = match_id;
        match_account.player1 = None;
        match_account.player2 = None;
        match_account.score1 = 0;
        match_account.score2 = 0;
        match_account.win_points = win_points;
        match_account.status = MatchStatus::Active;
        Ok(())
    }

    pub fn join_match(ctx: Context<JoinMatch>) -> Result<()> {
        let match_account = &mut ctx.accounts.match_account;
        let player = ctx.accounts.player.key();
        require!(match_account.status == MatchStatus::Active, FpsError::MatchFinished);
        if match_account.player1.is_none() {
            match_account.player1 = Some(player);
        } else if match_account.player2.is_none() {
            require!(match_account.player1.unwrap() != player, FpsError::AlreadyJoined);
            match_account.player2 = Some(player);
        } else {
            return err!(FpsError::MatchFull);
        }
        Ok(())
    }

    pub fn record_kill(ctx: Context<RecordKill>, victim: Pubkey) -> Result<()> {
        let match_account = &mut ctx.accounts.match_account;
        let shooter = ctx.accounts.shooter.key();
        require!(match_account.status == MatchStatus::Active, FpsError::MatchFinished);
        require!(match_account.player1.is_some() && match_account.player2.is_some(), FpsError::NotEnoughPlayers);

        if Some(shooter) == match_account.player1 {
            match_account.score1 = match_account.score1.checked_add(1).ok_or(FpsError::Overflow)?;
        } else if Some(shooter) == match_account.player2 {
            match_account.score2 = match_account.score2.checked_add(1).ok_or(FpsError::Overflow)?;
        } else {
            return err!(FpsError::NotAPlayer);
        }

        // Optional: ensure victim is one of the players
        require!(Some(victim) == match_account.player1 || Some(victim) == match_account.player2, FpsError::NotAPlayer);

        // Check win condition
        if match_account.score1 >= match_account.win_points {
            match_account.status = MatchStatus::Finished;
            match_account.winner = match_account.player1;
        } else if match_account.score2 >= match_account.win_points {
            match_account.status = MatchStatus::Finished;
            match_account.winner = match_account.player2;
        }

        Ok(())
    }

    pub fn finish_match(ctx: Context<FinishMatch>) -> Result<()> {
        let match_account = &mut ctx.accounts.match_account;
        require!(ctx.accounts.owner.key() == match_account.owner, FpsError::Unauthorized);
        match_account.status = MatchStatus::Finished;
        Ok(())
    }
}

#[derive(Accounts)]
#[instruction(match_id: u64, win_points: u8)]
pub struct CreateMatch<'info> {
    #[account(mut)]
    pub owner: Signer<'info>,
    #[account(
        init,
        payer = owner,
        space = 8 + MatchAccount::SIZE,
        seeds = [b"match", owner.key().as_ref(), match_id.to_le_bytes().as_ref()],
        bump,
    )]
    pub match_account: Account<'info, MatchAccount>,
    pub system_program: Program<'info, System>,
    // Remaining accounts: none
}

#[derive(Accounts)]
pub struct JoinMatch<'info> {
    pub player: Signer<'info>,
    #[account(mut)]
    pub match_account: Account<'info, MatchAccount>,
}

#[derive(Accounts)]
pub struct RecordKill<'info> {
    pub shooter: Signer<'info>,
    #[account(mut)]
    pub match_account: Account<'info, MatchAccount>,
}

#[derive(Accounts)]
pub struct FinishMatch<'info> {
    #[account(mut)]
    pub owner: Signer<'info>,
    #[account(mut)]
    pub match_account: Account<'info, MatchAccount>,
}

#[account]
pub struct MatchAccount {
    pub owner: Pubkey,
    pub match_id: u64,
    pub player1: Option<Pubkey>,
    pub player2: Option<Pubkey>,
    pub score1: u8,
    pub score2: u8,
    pub win_points: u8,
    pub status: MatchStatus,
    pub winner: Option<Pubkey>,
}

impl MatchAccount {
    // Rough size: Pubkeys (32*3) + u8*3 + status (1) + option flag (1) + padding
    pub const SIZE: usize = 32 /*owner*/ + 8 /*match_id*/ + (1 + 32) * 2 /*options*/ + 1 /*score1*/ + 1 /*score2*/ + 1 /*win_points*/ + 1 /*status*/ + (1 + 32) /*winner option*/ + 32 /*padding*/;
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq)]
pub enum MatchStatus {
    Active,
    Finished,
}

#[error_code]
pub enum FpsError {
    #[msg("Match is already full")] MatchFull,
    #[msg("Match already finished")] MatchFinished,
    #[msg("Not enough players in match")] NotEnoughPlayers,
    #[msg("Caller is not one of the players")] NotAPlayer,
    #[msg("Already joined as player1")] AlreadyJoined,
    #[msg("Arithmetic overflow")] Overflow,
    #[msg("Unauthorized")] Unauthorized,
}
