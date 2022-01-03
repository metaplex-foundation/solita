use anchor_lang::prelude::*;

declare_id!("CwrqeMj2U8tFr1Rhkgwc84tpAsqbt9pTt2a4taoTADPr");

#[program]
mod basic_4 {
    use super::*;

    pub fn create(ctx: Context<Create>, authority: Pubkey) -> ProgramResult {
        let counter = &mut ctx.accounts.counter;
        counter.authority = authority;
        counter.count = 0;
        Ok(())
    }

    pub fn increment(ctx: Context<Increment>) -> ProgramResult {
        let counter = &mut ctx.accounts.counter;
        if !counter.authority.eq(ctx.accounts.authority.key) {
            return Err(ErrorCode::Unauthorized.into());
        }
        if counter.count >= 1 {
            return Err(ErrorCode::MaxCountExceeded.into());
        }
        counter.count += 1;
        Ok(())
    }

    pub fn decrement(ctx: Context<Increment>) -> ProgramResult {
        let counter = &mut ctx.accounts.counter;
        if !counter.authority.eq(ctx.accounts.authority.key) {
            return Err(ErrorCode::Unauthorized.into());
        }
        if counter.count == 0 {
            return Err(ErrorCode::MinCountSubceeded.into());
        }
        counter.count -= 1;
        Ok(())
    }
}

#[derive(Accounts)]
pub struct Create<'info> {
    #[account(init, payer = user, space = 8 + 40)]
    pub counter: Account<'info, Counter>,
    #[account(mut)]
    pub user: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct Increment<'info> {
    #[account(mut, has_one = authority)]
    pub counter: Account<'info, Counter>,
    pub authority: Signer<'info>,
}

#[account]
pub struct Counter {
    pub authority: Pubkey,
    pub count: u64,
}

#[error]
pub enum ErrorCode {
    #[msg("You are not authorized to perform this action.")]
    Unauthorized,
    #[msg("You cannot increment more.")]
    MaxCountExceeded,
    #[msg("You cannot decrement more.")]
    MinCountSubceeded,
}
